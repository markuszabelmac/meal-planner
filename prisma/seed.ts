import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALLOWED_CATEGORIES = new Set([
  "Vegetables and Vegetable Products",
  "Fruits and Fruit Juices",
  "Beef Products",
  "Poultry Products",
  "Pork Products",
  "Lamb, Veal, and Game Products",
  "Finfish and Shellfish Products",
  "Dairy and Egg Products",
  "Legumes and Legume Products",
  "Cereal Grains and Pasta",
  "Nut and Seed Products",
  "Fats and Oils",
  "Spices and Herbs",
  "Baked Products",
]);

// USDA nutrient IDs
const NUTRIENT_KCAL = 1008;
const NUTRIENT_PROTEIN = 1003;
const NUTRIENT_FAT = 1004;
const NUTRIENT_SAT_FAT = 1258;
const NUTRIENT_CARBS = 1005;
const NUTRIENT_SUGARS = 2000;
const NUTRIENT_FIBER = 1079;

const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsdaFoodNutrient {
  nutrient: { id: number; name: string };
  amount: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodCategory?: { description: string };
  foodNutrients: UsdaFoodNutrient[];
}

interface ProcessedFood {
  fdcId: number;
  nameEn: string;
  kcalPer100g: number;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  satFatPer100g: number | null;
  carbsPer100g: number | null;
  sugarPer100g: number | null;
  fiberPer100g: number | null;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNutrientAmount(
  nutrients: UsdaFoodNutrient[],
  nutrientId: number
): number | null {
  const found = nutrients.find((n) => n.nutrient?.id === nutrientId);
  return found?.amount ?? null;
}

async function translateBatch(
  names: string[],
  attempt = 1
): Promise<string[] | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Translate the following food ingredient names from English to German. Return a JSON object with a single key 'translations' containing an array of strings in the same order. Use common German food names (e.g., 'Chicken breast, raw' -> 'Hähnchenbrust, roh', 'Potatoes, raw' -> 'Kartoffeln, roh'). If no standard German translation exists, keep the English term.",
        },
        {
          role: "user",
          content: JSON.stringify(names),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const translations: string[] =
      parsed.translations || parsed.Translations || Object.values(parsed)[0];

    if (!Array.isArray(translations) || translations.length !== names.length) {
      console.warn(
        `  [WARN] Translation response length mismatch: expected ${names.length}, got ${translations?.length}`
      );
      return null;
    }

    return translations;
  } catch (error) {
    if (attempt < 2) {
      console.warn(`  [WARN] Translation attempt ${attempt} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return translateBatch(names, attempt + 1);
    }
    console.warn(`  [WARN] Translation failed after 2 attempts:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== USDA SR Legacy Seed Script ===");
  console.log(`Started at: ${new Date().toISOString()}`);

  // Load USDA data
  const seedDataDir = join(__dirname, "seed-data");
  const jsonFile = readdirSync(seedDataDir).find((f) => f.endsWith(".json"));
  if (!jsonFile) {
    throw new Error(`No JSON file found in ${seedDataDir}`);
  }

  console.log(`\nLoading USDA data from: ${jsonFile}`);
  const raw = readFileSync(join(seedDataDir, jsonFile), "utf-8");
  const data = JSON.parse(raw);
  const allFoods: UsdaFood[] =
    data.SRLegacyFoods || data.FoundationFoods || Object.values(data)[0];

  if (!Array.isArray(allFoods)) {
    throw new Error("Could not find food array in USDA JSON");
  }

  console.log(`Total USDA foods: ${allFoods.length}`);

  // Filter by allowed categories
  const filtered = allFoods.filter(
    (f) => f.foodCategory && ALLOWED_CATEGORIES.has(f.foodCategory.description)
  );
  console.log(`Foods in allowed categories: ${filtered.length}`);

  // Extract nutrients and skip foods with missing kcal
  const processed: ProcessedFood[] = [];
  let skippedNoKcal = 0;

  for (const food of filtered) {
    const kcal = getNutrientAmount(food.foodNutrients, NUTRIENT_KCAL);
    if (kcal === null) {
      skippedNoKcal++;
      continue;
    }

    processed.push({
      fdcId: food.fdcId,
      nameEn: food.description,
      kcalPer100g: kcal,
      proteinPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_PROTEIN),
      fatPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_FAT),
      satFatPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_SAT_FAT),
      carbsPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_CARBS),
      sugarPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_SUGARS),
      fiberPer100g: getNutrientAmount(food.foodNutrients, NUTRIENT_FIBER),
    });
  }

  console.log(`Foods with kcal data: ${processed.length}`);
  console.log(`Skipped (missing kcal): ${skippedNoKcal}`);

  // Batch translate and upsert
  console.log(`\nStarting AI translation + upsert in batches of ${BATCH_SIZE}...`);

  let totalUpserted = 0;
  let totalSkippedTranslation = 0;

  for (let i = 0; i < processed.length; i += BATCH_SIZE) {
    const batch = processed.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(processed.length / BATCH_SIZE);

    if (i % 500 === 0 || i === 0) {
      console.log(
        `  Progress: ${i}/${processed.length} items (batch ${batchNum}/${totalBatches})`
      );
    }

    // Translate batch
    const names = batch.map((f) => f.nameEn);
    const translations = await translateBatch(names);

    if (!translations) {
      console.warn(
        `  [WARN] Skipping batch ${batchNum} (translation failed for ${batch.length} items)`
      );
      totalSkippedTranslation += batch.length;
      continue;
    }

    // Upsert each item in the batch
    for (let j = 0; j < batch.length; j++) {
      const food = batch[j];
      const germanName = translations[j];

      await prisma.ingredient.upsert({
        where: { fdcId: food.fdcId },
        update: {
          name: germanName,
          nameEn: food.nameEn,
          kcalPer100g: food.kcalPer100g,
          proteinPer100g: food.proteinPer100g,
          fatPer100g: food.fatPer100g,
          satFatPer100g: food.satFatPer100g,
          carbsPer100g: food.carbsPer100g,
          sugarPer100g: food.sugarPer100g,
          fiberPer100g: food.fiberPer100g,
          isCustom: false,
        },
        create: {
          fdcId: food.fdcId,
          name: germanName,
          nameEn: food.nameEn,
          kcalPer100g: food.kcalPer100g,
          proteinPer100g: food.proteinPer100g,
          fatPer100g: food.fatPer100g,
          satFatPer100g: food.satFatPer100g,
          carbsPer100g: food.carbsPer100g,
          sugarPer100g: food.sugarPer100g,
          fiberPer100g: food.fiberPer100g,
          isCustom: false,
        },
      });

      totalUpserted++;
    }
  }

  // Final stats
  const totalInDb = await prisma.ingredient.count();

  console.log("\n=== Seed Complete ===");
  console.log(`Upserted in this run: ${totalUpserted}`);
  console.log(`Skipped (translation failure): ${totalSkippedTranslation}`);
  console.log(`Total ingredients in database: ${totalInDb}`);

  // Spot check German ingredients
  console.log("\nSpot check — searching for common German ingredients:");
  const spotChecks = [
    { term: "kartoffel", label: "Kartoffeln" },
    { term: "butter", label: "Butter" },
    { term: "mehl", label: "Mehl" },
    { term: "hack", label: "Hackfleisch" },
    { term: "zwiebel", label: "Zwiebeln" },
  ];

  for (const { term, label } of spotChecks) {
    const found = await prisma.ingredient.count({
      where: {
        name: { contains: term, mode: "insensitive" },
      },
    });
    console.log(`  ${label}: ${found} match(es)`);
  }

  console.log(`\nFinished at: ${new Date().toISOString()}`);
}

main()
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
