import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Map common German cooking terms to USDA English names
// Format: [germanName, englishSearchTerm]
const GERMAN_ALIASES: [string, string][] = [
  // Gemüse
  ["Fleischtomate", "Tomatoes, red, ripe, raw"],
  ["Tomate", "Tomatoes, red, ripe, raw"],
  ["Zwiebel", "Onions, raw"],
  ["Knoblauch", "Garlic, raw"],
  ["Kartoffel", "Potatoes, flesh and skin, raw"],
  ["Karotte", "Carrots, raw"],
  ["Möhre", "Carrots, raw"],
  ["Paprika", "Peppers, sweet, red, raw"],
  ["Gurke", "Cucumber, with peel, raw"],
  ["Zucchini", "Squash, summer, zucchini, includes skin, raw"],
  ["Brokkoli", "Broccoli, raw"],
  ["Blumenkohl", "Cauliflower, raw"],
  ["Spinat", "Spinach, raw"],
  ["Champignon", "Mushrooms, white, raw"],
  ["Lauch", "Leeks, (bulb and lower leaf-portion), raw"],
  ["Sellerie", "Celery, raw"],
  ["Aubergine", "Eggplant, raw"],
  ["Kürbis", "Pumpkin, raw"],
  ["Süßkartoffel", "Sweet potato, raw, unprepared"],
  ["Mais", "Corn, sweet, yellow, raw"],
  ["Erbsen", "Peas, green, raw"],
  ["Bohnen, grün", "Beans, snap, green, raw"],

  // Obst
  ["Zitrone", "Lemons, raw, without peel"],
  ["Limette", "Limes, raw"],
  ["Orange", "Oranges, raw, all commercial varieties"],
  ["Apfel", "Apples, raw, with skin"],
  ["Banane", "Bananas, raw"],
  ["Erdbeere", "Strawberries, raw"],
  ["Himbeere", "Raspberries, raw"],
  ["Blaubeere", "Blueberries, raw"],
  ["Avocado", "Avocados, raw, all commercial varieties"],
  ["Mango", "Mangos, raw"],

  // Fleisch
  ["Hackfleisch, gemischt", "Beef, ground, 80% lean meat / 20% fat, raw"],
  ["Rindfleisch", "Beef, round, top round steak, boneless, separable lean and fat, trimmed to 0\" fat, all grades, raw"],
  ["Hähnchenbrust", "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw"],
  ["Hähnchenschenkel", "Chicken, broiler or fryers, thigh, meat only, raw"],
  ["Schweinefleisch", "Pork, fresh, loin, whole, separable lean and fat, raw"],
  ["Schweinefilet", "Pork, fresh, loin, tenderloin, separable lean only, raw"],
  ["Speck", "Pork, cured, bacon, unprepared"],
  ["Schinken", "Ham, sliced, regular (approximately 11% fat)"],
  ["Bratwurst", "Pork sausage, fresh, raw"],
  ["Lamm", "Lamb, domestic, leg, whole (shank and sirloin), separable lean and fat, trimmed to 1/4\" fat, choice, raw"],

  // Fisch
  ["Lachs", "Fish, salmon, Atlantic, wild, raw"],
  ["Thunfisch", "Fish, tuna, light, canned in water, drained solids"],
  ["Garnelen", "Crustaceans, shrimp, mixed species, raw"],
  ["Kabeljau", "Fish, cod, Atlantic, raw"],
  ["Forelle", "Fish, trout, rainbow, wild, raw"],

  // Milchprodukte
  ["Milch", "Milk, whole, 3.25% milkfat, with added vitamin D"],
  ["Sahne", "Cream, fluid, heavy whipping"],
  ["Schmand", "Cream, sour, regular, cultured"],
  ["Saure Sahne", "Cream, sour, regular, cultured"],
  ["Joghurt", "Yogurt, plain, whole milk"],
  ["Quark", "Cheese, cottage, creamed, large or small curd"],
  ["Butter", "Butter, salted"],
  ["Käse, Gouda", "Cheese, gouda"],
  ["Käse, Mozzarella", "Cheese, mozzarella, whole milk"],
  ["Käse, Parmesan", "Cheese, parmesan, hard"],
  ["Frischkäse", "Cheese, cream"],
  ["Ei", "Egg, whole, raw, fresh"],
  ["Eier", "Egg, whole, raw, fresh"],

  // Getreide & Teigwaren
  ["Mehl", "Wheat flour, white, all-purpose, enriched, bleached"],
  ["Weizenmehl", "Wheat flour, white, all-purpose, enriched, bleached"],
  ["Vollkornmehl", "Wheat flour, whole-grain"],
  ["Reis", "Rice, white, long-grain, regular, raw, enriched"],
  ["Nudeln", "Pasta, dry, enriched"],
  ["Spaghetti", "Pasta, dry, enriched"],
  ["Haferflocken", "Cereals, oats, regular and quick, not fortified, dry"],
  ["Brot", "Bread, wheat"],
  ["Toastbrot", "Bread, white, commercially prepared, toasted"],
  ["Brötchen", "Rolls, dinner, wheat"],
  ["Paniermehl", "Bread crumbs, dry, grated, plain"],

  // Öle & Fette
  ["Olivenöl", "Oil, olive, salad or cooking"],
  ["Sonnenblumenöl", "Oil, sunflower, linoleic, (approx. 65%)"],
  ["Rapsöl", "Oil, canola"],
  ["Kokosöl", "Oil, coconut"],
  ["Margarine", "Margarine, regular, 80% fat, composite, stick, with salt"],

  // Gewürze & Kräuter
  ["Salz", "Salt, table"],
  ["Pfeffer", "Spices, pepper, black"],
  ["Zucker", "Sugars, granulated"],
  ["Honig", "Honey"],
  ["Senf", "Mustard, prepared, yellow"],
  ["Ketchup", "Catsup"],
  ["Sojasauce", "Soy sauce made from soy (tamari)"],
  ["Essig", "Vinegar, cider"],
  ["Petersilie", "Parsley, fresh"],
  ["Basilikum", "Basil, fresh"],
  ["Oregano", "Spices, oregano, dried"],
  ["Thymian", "Spices, thyme, dried"],
  ["Rosmarin", "Spices, rosemary, dried"],
  ["Zimt", "Spices, cinnamon, ground"],
  ["Paprikapulver", "Spices, paprika"],
  ["Kreuzkümmel", "Spices, cumin seed"],
  ["Ingwer", "Ginger root, raw"],
  ["Chili", "Peppers, hot chili, red, raw"],
  ["Muskatnuss", "Spices, nutmeg, ground"],

  // Hülsenfrüchte & Nüsse
  ["Linsen", "Lentils, raw"],
  ["Kichererbsen", "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw"],
  ["Kidneybohnen", "Beans, kidney, red, mature seeds, raw"],
  ["Walnüsse", "Nuts, walnuts, english"],
  ["Mandeln", "Nuts, almonds"],
  ["Erdnüsse", "Peanuts, all types, raw"],
  ["Cashewkerne", "Nuts, cashew nuts, raw"],
  ["Sonnenblumenkerne", "Seeds, sunflower seed kernels, dried"],
  ["Sesam", "Seeds, sesame seeds, whole, dried"],

  // Sonstiges
  ["Tomatenmark", "Tomato paste, canned, without salt added"],
  ["Kokosmilch", "Nuts, coconut milk, canned (liquid expressed from grated meat and water)"],
  ["Brühe", "Soup, stock, chicken, home-prepared"],
  ["Hefe", "Leavening agents, yeast, baker's, active dry"],
  ["Backpulver", "Leavening agents, baking powder, double-acting, sodium aluminum sulfate"],
  ["Stärke", "Cornstarch"],
  ["Kakao", "Cocoa, dry powder, unsweetened"],
  ["Schokolade, dunkel", "Chocolate, dark, 70-85% cacao solids"],
];

async function main() {
  console.log(`Updating ${GERMAN_ALIASES.length} German aliases...`);

  let updated = 0;
  let notFound = 0;
  let alreadyCorrect = 0;

  for (const [germanName, englishName] of GERMAN_ALIASES) {
    // Find the USDA ingredient by English name
    const ingredient = await prisma.ingredient.findFirst({
      where: { nameEn: englishName },
    });

    if (!ingredient) {
      // Try partial match
      const partial = await prisma.ingredient.findFirst({
        where: { nameEn: { contains: englishName.split(",")[0], mode: "insensitive" } },
      });

      if (partial) {
        if (partial.name !== germanName) {
          // Check if another entry already has this German name
          const existing = await prisma.ingredient.findFirst({
            where: { name: germanName },
          });
          if (!existing) {
            await prisma.ingredient.update({
              where: { id: partial.id },
              data: { name: germanName },
            });
            console.log(`  ✓ ${germanName} ← ${partial.nameEn}`);
            updated++;
          } else {
            console.log(`  ~ ${germanName} already exists as separate entry`);
            alreadyCorrect++;
          }
        } else {
          alreadyCorrect++;
        }
      } else {
        console.log(`  ✗ Not found: "${englishName}"`);
        notFound++;
      }
      continue;
    }

    if (ingredient.name === germanName) {
      alreadyCorrect++;
      continue;
    }

    // Check if another entry already has this German name
    const existing = await prisma.ingredient.findFirst({
      where: { name: germanName, id: { not: ingredient.id } },
    });
    if (existing) {
      console.log(`  ~ ${germanName} already exists as separate entry`);
      alreadyCorrect++;
      continue;
    }

    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { name: germanName },
    });
    console.log(`  ✓ ${germanName} ← ${ingredient.nameEn}`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Already correct: ${alreadyCorrect}, Not found: ${notFound}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
