import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import OpenAI from "openai";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 });

const BATCH_SIZE = 1; // One at a time for maximum reliability

async function translateSmallBatch(names: string[]): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Translate these ${names.length} English food names to German. Return JSON: {"translations": ["german1", "german2", ...]}. Use common German cooking terms. Keep English if no German term exists.`,
        },
        { role: "user", content: JSON.stringify(names) },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const translations: string[] = parsed.translations || parsed.Translations || [];

    // Return what we got, pad with English for any missing
    const result: string[] = [];
    for (let i = 0; i < names.length; i++) {
      result.push(translations[i] || names[i]);
    }
    return result;
  } catch (err) {
    console.warn(`  Translation failed, keeping English: ${(err as Error).message?.slice(0, 60)}`);
    return names; // Fallback: keep English
  }
}

async function main() {
  // Find all ingredients where name === nameEn (not translated)
  const untranslated = await prisma.ingredient.findMany({
    where: {
      nameEn: { not: null },
      isCustom: false,
    },
    select: { id: true, name: true, nameEn: true },
  });

  const needsTranslation = untranslated.filter(
    (i) => i.nameEn && i.name === i.nameEn
  );

  console.log(`Found ${needsTranslation.length} ingredients needing German translation`);

  if (needsTranslation.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  let updated = 0;
  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE);
    const names = batch.map((b) => b.nameEn!);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsTranslation.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} items)`);

    const translations = await translateSmallBatch(names);

    for (let j = 0; j < batch.length; j++) {
      if (translations[j] !== batch[j].nameEn) {
        await prisma.ingredient.update({
          where: { id: batch[j].id },
          data: { name: translations[j] },
        });
        updated++;
      }
    }
  }

  console.log(`\nDone! Updated ${updated} of ${needsTranslation.length} ingredients.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
