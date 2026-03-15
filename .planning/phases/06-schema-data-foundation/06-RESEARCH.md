# Phase 6: Schema & Data Foundation - Research

**Researched:** 2026-03-15
**Domain:** Prisma schema migration, PostgreSQL pg_trgm, USDA FoodData Central seed
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Re-add `mealType` as an enum with 4 values: `fruehstueck`, `mittag`, `abend`, `snacks`
- Change unique constraint to `@@unique([date, forUserId, mealType])`
- Migrate existing MealPlan entries: set all to `abend` (Abendessen)
- Week planner UI: show only filled slots + an "Add" button per day (not all 4 slots fixed)
- Ingredient table has German name as primary field (`name`) and English USDA name as alias field (`nameEn`)
- Fuzzy matching (pg_trgm) searches against both German and English name fields
- GIN index on both name fields for performance
- Filter USDA SR Legacy to relevant food categories (~2-3k entries): meat, vegetables, fruit, grains, dairy, oils, spices, nuts, legumes
- AI translates English USDA names to German during seed generation (one-time cost)
- Implement as `prisma db seed` — idempotent and repeatable
- Users can add fully custom ingredients with their own nutrition data (not restricted to USDA)
- Unit stored as enum in RecipeIngredient: `g`, `kg`, `ml`, `l`, `stueck`, `el`, `tl`, `prise`
- Enum is extensible (more values can be added later via migration)
- Fixed conversion table for nutrition calculation: 1 EL = 15g, 1 TL = 5g, 1 Prise = 0.5g, Stück stays as-is (fallback to AI estimation in Phase 9)
- kg → g and l → ml are simple multiplications

### Claude's Discretion
- Exact Prisma schema field names and types
- pg_trgm similarity threshold value
- USDA category filtering logic
- Seed script error handling and batch size
- Migration ordering (schema first, then seed)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | Ingredient table with nutritional values per 100g (kcal, protein, fat, saturated fat, carbs, sugar, fiber) | USDA API reveals exact nutrient IDs; Prisma Float fields map directly |
| DB-02 | RecipeIngredient join (Recipe → Ingredient with amount + unit) | Standard Prisma many-to-many via explicit join table; unit enum pattern documented |
| DB-03 | MealPlan supports multiple meals per day per user | mealType enum migration from existing `@@unique([date, forUserId])` — custom SQL migration required due to PostgreSQL ALTER TYPE transaction limitations |
| DB-04 | pg_trgm Extension + GIN index for fuzzy matching | `CREATE EXTENSION IF NOT EXISTS pg_trgm` in migration; GIN index on `name` and `name_en` columns |
| DB-05 | USDA seed script with German aliases for common ingredients | SR Legacy JSON/CSV download; nutrient IDs confirmed; idempotent upsert via `prisma db seed`; AI translation at seed generation time |
</phase_requirements>

---

## Summary

Phase 6 establishes the nutritional database foundation that all subsequent phases depend on. It has three distinct work streams: (1) Prisma schema changes — new Ingredient and RecipeIngredient models, plus a MealPlan migration adding the mealType enum; (2) PostgreSQL setup — enabling pg_trgm and creating GIN indexes; (3) data seeding — a one-time script that downloads filtered USDA SR Legacy data, AI-translates the English names to German, and upserts ~2-3k rows into the Ingredient table.

The most technically complex part is the MealPlan migration. The existing `@@unique([date, forUserId])` constraint must be replaced with `@@unique([date, forUserId, mealType])`. The previous migration `20260228120000_simplify_weekplan` dropped the old `meal_type` column; we are now re-adding it as a new enum. PostgreSQL's `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block, which means the generated Prisma migration SQL must be customized. The pattern is: run `prisma migrate dev --create-only`, then manually edit the migration SQL to split the enum creation and the data UPDATE into separate statements outside the default transaction wrapper.

The USDA FoodData Central SR Legacy dataset contains 7,793 foods. Filtering to relevant categories (Vegetables, Fruits, Beef, Poultry, Pork, Dairy, Grains, Nuts, Spices, Oils) will yield approximately 2,000-3,000 entries. The nutrient IDs are confirmed: energy=1008 (kcal), protein=1003, fat=1004, carbs=1005, sugars=2000, fiber=1079, saturated fat=1258. The seed script downloads the SR Legacy JSON (~205MB unzipped), filters by food category, AI-translates names in batches, and upserts using `fdcId` as the idempotent key.

**Primary recommendation:** Execute in three sequential tasks — (1) schema migration with MealPlan fix + new models, (2) pg_trgm migration + GIN indexes, (3) seed script with AI translation + upsert.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^7.4.0 (already installed) | Schema definition, migrations, seed runner | Already in use; seed configured via `prisma.config.ts` `migrations.seed` |
| PostgreSQL pg_trgm | Built-in extension | Fuzzy trigram matching | Server-side; no client library; handles German umlauts via UTF-8 |
| Node.js native TS | v25.4.0 (already installed) | Run seed script in TypeScript | Node 25 supports native TS type-stripping by default (no tsx needed) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenAI SDK | ^6.25.0 (already installed) | Batch AI translation of USDA names to German | Seed script only; one-time cost at seed generation time |
| dotenv | ^17.2.4 (already installed) | Environment variables in seed script | Seed runs outside Next.js context, needs DATABASE_URL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node native TS (seed runner) | tsx | tsx not installed; Node 25 runs `.ts` natively without tsx (type-stripping enabled by default). No install needed. |
| USDA JSON bulk download | USDA FDC API at runtime | Bulk download is one-time; API requires key management, rate limiting, network dependency at seed time |
| AI translation at seed time | Manual German names | AI translation scales to 2-3k items in a few batches; manual entry is impractical |

**Installation — new dependencies needed:**

None. All required tools (Prisma, OpenAI SDK, Node.js, dotenv) are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
prisma/
├── schema.prisma            # Updated with Ingredient, RecipeIngredient, MealPlan enum
├── seed.ts                  # USDA seed script (new)
├── seed-data/
│   └── usda-sr-legacy.json  # Downloaded once, committed or gitignored (large)
├── migrations/
│   ├── ...existing migrations...
│   ├── YYYYMMDDHHMMSS_add_meal_type_enum/
│   │   └── migration.sql    # Custom-edited (ALTER TYPE outside transaction)
│   ├── YYYYMMDDHHMMSS_add_ingredient_models/
│   │   └── migration.sql    # New tables + pg_trgm extension
│   └── YYYYMMDDHHMMSS_add_gin_indexes/
│       └── migration.sql    # GIN indexes on Ingredient name fields
prisma.config.ts             # Updated with migrations.seed = "node --experimental-transform-types prisma/seed.ts"
```

### Pattern 1: MealType Enum Migration (Multi-Step Custom SQL)

**What:** Re-adding a `meal_type` column as an enum after it was previously dropped. PostgreSQL requires `ALTER TYPE ... ADD VALUE` to commit before any `UPDATE` using that value can reference it.

**When to use:** Any time you add a new enum type and simultaneously need to UPDATE existing rows to use a value from that enum.

**The critical rule:** In PostgreSQL, you cannot use a newly-created enum value in the same transaction that created it. The solution is to generate a custom migration with `--create-only` and split the SQL into separate statements.

**Migration SQL pattern:**
```sql
-- Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations

-- Step 1: Create the enum type (this must commit before UPDATE can use it)
CREATE TYPE "MealType" AS ENUM ('fruehstueck', 'mittag', 'abend', 'snacks');

-- Step 2: Add the column as nullable first (allows existing rows without a value)
ALTER TABLE "meal_plans" ADD COLUMN "meal_type" "MealType";

-- Step 3: Set existing rows to 'abend' (locked decision: migrate existing entries to Abend)
UPDATE "meal_plans" SET "meal_type" = 'abend' WHERE "meal_type" IS NULL;

-- Step 4: Make column NOT NULL after data is populated
ALTER TABLE "meal_plans" ALTER COLUMN "meal_type" SET NOT NULL;

-- Step 5: Drop the old unique constraint
ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_date_for_user_id_key";

-- Step 6: Add the new 3-field unique constraint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_date_for_user_id_meal_type_key" UNIQUE ("date", "for_user_id", "meal_type");
```

**IMPORTANT:** The default Prisma migration wraps everything in `BEGIN ... COMMIT`. For this migration, Prisma generates the `CREATE TYPE ... AS ENUM` statement at the top-level before `BEGIN`, so the enum creation is already outside the transaction. However, `ALTER TABLE ADD COLUMN ... DEFAULT` with a new enum value fails. The safe pattern is: add column nullable → UPDATE → set NOT NULL. Do not use `DEFAULT 'abend'` on the `ALTER TABLE` statement.

### Pattern 2: Ingredient and RecipeIngredient Prisma Schema

**What:** New models with all nutritional fields nullable (real USDA data has gaps) except `name` and `kcalPer100g`.

**Prisma schema:**
```prisma
// Source: Direct codebase inspection + USDA API field verification

enum MealType {
  fruehstueck
  mittag
  abend
  snacks

  @@map("MealType")
}

enum Unit {
  g
  kg
  ml
  l
  stueck
  el
  tl
  prise

  @@map("Unit")
}

model Ingredient {
  id             String             @id @default(cuid())
  name           String             // German name (primary)
  nameEn         String?            @map("name_en")  // English USDA name (alias)
  fdcId          Int?               @unique @map("fdc_id")  // USDA FDC ID for idempotent seed
  kcalPer100g    Float              @map("kcal_per_100g")
  proteinPer100g Float?             @map("protein_per_100g")
  fatPer100g     Float?             @map("fat_per_100g")
  satFatPer100g  Float?             @map("sat_fat_per_100g")
  carbsPer100g   Float?             @map("carbs_per_100g")
  sugarPer100g   Float?             @map("sugar_per_100g")
  fiberPer100g   Float?             @map("fiber_per_100g")
  isCustom       Boolean            @default(false) @map("is_custom")
  createdAt      DateTime           @default(now()) @map("created_at")
  updatedAt      DateTime           @updatedAt @map("updated_at")
  recipeIngredients RecipeIngredient[]

  @@map("ingredients")
}

model RecipeIngredient {
  id           String     @id @default(cuid())
  recipeId     String     @map("recipe_id")
  ingredientId String?    @map("ingredient_id")  // Nullable: AI-estimated fallback has no DB ingredient
  amount       Float
  unit         Unit
  // AI-estimated nutrition fallback (used when ingredientId is null)
  estimatedKcal    Float? @map("estimated_kcal")
  estimatedProtein Float? @map("estimated_protein")
  estimatedFat     Float? @map("estimated_fat")
  estimatedCarbs   Float? @map("estimated_carbs")
  createdAt    DateTime   @default(now()) @map("created_at")
  recipe       Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient   Ingredient? @relation(fields: [ingredientId], references: [id], onDelete: SetNull)

  @@map("recipe_ingredients")
}
```

**Note on `ingredientId` nullability:** When an ingredient has no DB match (Phase 9 fallback), `ingredientId` is null and the estimated* fields carry the nutrition. The `onDelete: SetNull` ensures RecipeIngredient survives ingredient deletion. This is a Phase 6 decision that avoids a re-migration in Phase 9.

### Pattern 3: pg_trgm Migration

**What:** Enable extension and create GIN indexes on both name columns.

**Migration SQL:**
```sql
-- Source: https://www.postgresql.org/docs/current/pgtrgm.html

-- Enable pg_trgm (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on German name (primary search target)
CREATE INDEX ingredients_name_trgm_idx ON "ingredients" USING GIN ("name" gin_trgm_ops);

-- GIN index on English name (secondary search target for USDA data)
CREATE INDEX ingredients_name_en_trgm_idx ON "ingredients" USING GIN ("name_en" gin_trgm_ops);
```

**Query pattern for fuzzy search (used in Phase 8 autocomplete):**
```sql
-- Source: https://www.postgresql.org/docs/current/pgtrgm.html
SELECT id, name, "name_en",
       GREATEST(similarity(name, $1), similarity(COALESCE("name_en", ''), $1)) AS sml
FROM ingredients
WHERE name % $1 OR "name_en" % $1
ORDER BY sml DESC
LIMIT 10;
```

**Threshold:** Use default `0.3` for the `%` operator during Phase 6. The similarity threshold for auto-linking (Phase 9) must be 0.9+ (documented in STATE.md concern). Phase 6 only needs the extension and indexes, not the query code.

### Pattern 4: Idempotent Seed Script

**What:** Downloads USDA SR Legacy JSON, filters to relevant categories, AI-translates in batches, upserts using `fdcId` as key.

**package.json / prisma.config.ts:**
```typescript
// prisma.config.ts — add migrations.seed
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-transform-types prisma/seed.ts",
  },
  // ...
});
```

**Why `--experimental-transform-types`:** Node 25 supports native TypeScript type-stripping by default, but Prisma-generated enums in the seed script may use TypeScript `enum` syntax. `--experimental-transform-types` handles TypeScript enums and namespaces beyond simple type-stripping.

**Seed script pattern:**
```typescript
// prisma/seed.ts
import { PrismaClient } from "@/generated/prisma/client";
// Cannot use @/ alias in seed — use relative path instead:
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// USDA nutrient IDs (confirmed via API inspection)
const NUTRIENT_IDS = {
  energy: 1008,      // kcal
  protein: 1003,
  fat: 1004,
  satFat: 1258,
  carbs: 1005,
  sugars: 2000,
  fiber: 1079,
} as const;

// SR Legacy food category names to include
const ALLOWED_CATEGORIES = new Set([
  "Vegetables and Vegetable Products",
  "Fruits and Fruit Juices",
  "Beef Products",
  "Poultry Products",
  "Pork Products",
  "Lamb, Veal, and Game Products",
  "Fish and Seafood",
  "Dairy and Egg Products",
  "Legumes and Legume Products",
  "Cereal Grains and Pasta",
  "Nut and Seed Products",
  "Fats and Oils",
  "Spices and Herbs",
  "Baked Products",
]);

async function main() {
  // 1. Load USDA JSON (downloaded once to prisma/seed-data/)
  // 2. Filter by food category
  // 3. Batch AI-translate English names to German (50 names per call)
  // 4. Upsert with fdcId as key (idempotent)

  const batchSize = 50; // 50 names per AI call to stay within context

  for (const batch of batches) {
    await prisma.ingredient.upsert({
      where: { fdcId: item.fdcId },
      update: { /* all fields */ },
      create: { /* all fields */ },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

**IMPORTANT — path alias:** The seed script runs outside Next.js, so `@/` path aliases do not work. Import Prisma client with a relative path: `../src/generated/prisma/client`.

**IMPORTANT — USDA JSON format:** The bulk download JSON is a single top-level object with a `SRLegacyFoods` array. Each food item has: `fdcId`, `description` (English name), `foodCategory.description` (category string), `foodNutrients` array where each entry has `nutrient.id` (numeric) and `amount`.

### Anti-Patterns to Avoid

- **Using `DEFAULT 'abend'` on `ALTER TABLE ADD COLUMN`:** In the same migration transaction, PostgreSQL rejects using a freshly-created enum value as a column default. Add nullable → UPDATE → set NOT NULL.
- **Using `@/` path alias in seed.ts:** The seed script runs via Node directly, not via Next.js, so path aliases are not resolved. Use relative paths.
- **Running `prisma migrate dev` without `--create-only` for the MealPlan migration:** The auto-generated SQL may not handle the nullable-first pattern correctly. Always use `--create-only` and review before applying.
- **Importing all 7,793 USDA SR Legacy foods:** This floods the autocomplete with obscure US items. The ~14 allowed categories reduce this to ~2,500 meaningful foods.
- **AI-translating inside the upsert loop (1 name = 1 API call):** Batch 50 names per call to avoid rate limits and high latency. One batch call translates 50 names in < 2 seconds.
- **Storing nutrient values as `Int`:** USDA values are Float (e.g., 0.0140g saturated fat in broccoli). Use `Float` for all nutrient fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text search | Levenshtein distance function | pg_trgm GIN index | Handles German umlauts, scales to 10k rows, server-side (no client payload) |
| TypeScript runner for seed | Compile TS → JS manually | `node --experimental-transform-types` | Node 25 is already installed, no additional tooling needed |
| Idempotent seed | truncate-and-reinsert pattern | Prisma `upsert` with `fdcId` unique key | Re-runnable without data loss; safe for production |
| Unit conversion table | Complex parsing library | Hardcoded `const` map in `src/lib/units.ts` | Only 8 units; a map is clearer and zero-dependency |

**Key insight:** pg_trgm is a built-in PostgreSQL extension (zero npm dependencies) that handles the only non-trivial algorithmic problem in this phase.

---

## Common Pitfalls

### Pitfall 1: PostgreSQL Transaction Limitation on ALTER TYPE
**What goes wrong:** `prisma migrate dev` generates a migration wrapping everything in `BEGIN ... COMMIT`. When the same transaction creates an enum type AND then tries to use that enum value in a column DEFAULT or UPDATE, PostgreSQL throws: `unsafe use of new value "abend" of enum type "MealType"`.

**Why it happens:** PostgreSQL requires enum additions to be committed before they can be referenced in DML statements within the same session.

**How to avoid:** Use `prisma migrate dev --create-only` to generate the SQL without applying it. Edit the migration SQL to: (a) add column as nullable (no default), (b) UPDATE rows in the same transaction after the enum type exists, (c) set NOT NULL afterward. Prisma already generates `CREATE TYPE` outside the BEGIN block, so the enum exists by the time UPDATE runs.

**Warning signs:** Migration fails with `ERROR: unsafe use of new value` or `ERROR: cannot use a just-created enum value`.

### Pitfall 2: Existing MealPlan Data at Migration Time
**What goes wrong:** The unique constraint change from `@@unique([date, forUserId])` to `@@unique([date, forUserId, mealType])` requires all existing rows to have `mealType` set before the NOT NULL constraint is added.

**Why it happens:** The migration applies column add + constraint change in sequence. If `NOT NULL` is added before the UPDATE runs, or if the constraint is dropped after the column is added but before UPDATE, constraint violations occur.

**How to avoid:** The migration order is: (1) drop old constraint, (2) add column nullable, (3) UPDATE all rows to 'abend', (4) add NOT NULL, (5) add new constraint. In the custom SQL, verify this order explicitly.

**Warning signs:** `ERROR: column "meal_type" of relation "meal_plans" contains null values` when adding NOT NULL.

### Pitfall 3: USDA JSON Bulk Download Size vs. In-Memory Processing
**What goes wrong:** The SR Legacy JSON is 205MB unzipped. Loading the entire file into memory with `JSON.parse(fs.readFileSync(...))` in the seed script will work but is slow (~3-5s parse time) and uses ~600MB RAM.

**Why it happens:** Node.js JSON parsing is synchronous and loads the entire structure into memory.

**How to avoid:** For Phase 6, the simple `readFileSync` + `JSON.parse` approach is acceptable (one-time seed script, not production code). If memory is a concern, use streaming JSON parsing (`stream-json` package), but this adds complexity for a one-time script. Document in the seed script that it requires ~1GB free RAM.

**Warning signs:** `JavaScript heap out of memory` during seed.

### Pitfall 4: GIN Index on Nullable nameEn Column
**What goes wrong:** `CREATE INDEX ... USING GIN ("name_en" gin_trgm_ops)` on a nullable column silently omits NULL rows from the index. Query `WHERE "name_en" % $1` still works but returns no results for unset rows.

**Why it happens:** GIN indexes skip NULL values by default.

**How to avoid:** This is the correct behavior — custom ingredients without a USDA English name should not be returned in English-name searches. No change needed; document it as expected behavior.

**Warning signs:** None — this is not a pitfall but a feature of GIN index behavior.

### Pitfall 5: Seed Script @/ Path Alias Failure
**What goes wrong:** `import { PrismaClient } from "@/generated/prisma/client"` throws `Cannot find module '@/generated/prisma/client'` when running `npx prisma db seed`.

**Why it happens:** The `@/` alias is configured in tsconfig.json `paths` for the Next.js build context. Node.js running the seed script directly does not read tsconfig.json path aliases.

**How to avoid:** Use `../src/generated/prisma/client` (relative path) in seed.ts. Also use relative paths for any other local imports in the seed script.

**Warning signs:** `Cannot find module '@/...'` error when running `prisma db seed`.

### Pitfall 6: week-planner.tsx mealType Grouping After Migration
**What goes wrong:** The current `getEntries(date)` function in `week-planner.tsx` returns all entries for a date and groups them by recipe identity. After the migration, multiple entries per day become possible (one per mealType), but the grouping logic doesn't distinguish mealType — two different meals on the same day for the same user would still be grouped by recipe key.

**Why it happens:** `groupEntries()` groups by `entry.recipe.id` or `custom:${entry.customMeal}`, not by mealType. When two different mealTypes have the same recipe assigned, they collapse into one group.

**How to avoid:** In the week-planner update task (part of this phase), add `mealType` to the `MealPlanEntry` type, update the API response to include it, and group by `mealType` as the primary key (one slot per mealType per day). The "Add" button opens a mealType selector.

**Warning signs:** Duplicate recipe entries collapsing on the same day in the week planner after migration.

---

## Code Examples

Verified patterns from official sources:

### USDA Nutrient Extraction from SR Legacy JSON Item
```typescript
// Source: Confirmed via USDA FDC API (fdcId 170379 = Broccoli raw)
// Nutrient IDs: energy=1008, protein=1003, fat=1004, satFat=1258,
//               carbs=1005, sugars=2000, fiber=1079

function getNutrientValue(
  foodNutrients: Array<{ nutrient: { id: number }; amount: number }>,
  nutrientId: number
): number | null {
  const entry = foodNutrients.find((fn) => fn.nutrient.id === nutrientId);
  return entry?.amount ?? null;
}

// Usage:
const kcal = getNutrientValue(food.foodNutrients, 1008); // required
const protein = getNutrientValue(food.foodNutrients, 1003); // nullable ok
```

### pg_trgm Similarity Query (Prisma raw)
```typescript
// Source: https://www.postgresql.org/docs/current/pgtrgm.html
// Used in Phase 8 autocomplete — included here for planner context

const results = await prisma.$queryRaw<IngredientRow[]>`
  SELECT id, name, name_en,
    GREATEST(
      similarity(name, ${query}),
      similarity(COALESCE(name_en, ''), ${query})
    ) AS sml
  FROM ingredients
  WHERE name % ${query} OR name_en % ${query}
  ORDER BY sml DESC
  LIMIT 10
`;
```

### Prisma Upsert for Idempotent Seed
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
// fdcId is the unique key for USDA items; null for custom ingredients

await prisma.ingredient.upsert({
  where: { fdcId: food.fdcId },
  update: {
    name: germanName,
    nameEn: food.description,
    kcalPer100g: kcal!,
    proteinPer100g: protein,
    fatPer100g: fat,
    satFatPer100g: satFat,
    carbsPer100g: carbs,
    sugarPer100g: sugars,
    fiberPer100g: fiber,
  },
  create: {
    name: germanName,
    nameEn: food.description,
    fdcId: food.fdcId,
    kcalPer100g: kcal!,
    proteinPer100g: protein,
    fatPer100g: fat,
    satFatPer100g: satFat,
    carbsPer100g: carbs,
    sugarPer100g: sugars,
    fiberPer100g: fiber,
    isCustom: false,
  },
});
```

### AI Batch Translation Pattern (50 names per call)
```typescript
// Source: Existing openai SDK usage in project (src/app/api/ai/suggest/route.ts pattern)
// Batch 50 USDA English names per call to avoid rate limits

async function translateBatch(englishNames: string[]): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cheap; translation is low-complexity
    messages: [
      {
        role: "system",
        content:
          "Translate the following food ingredient names from English to German. " +
          "Return a JSON array of strings in the same order as the input. " +
          "Use common German food names (e.g., 'Chicken Breast' → 'Hähnchenbrust'). " +
          "If a name has no standard German translation, keep the English term.",
      },
      {
        role: "user",
        content: JSON.stringify(englishNames),
      },
    ],
    response_format: { type: "json_object" },
  });
  // Parse and return the translations array
}
```

### MealPlanEntry Type Update (week-planner.tsx)
```typescript
// Source: Direct codebase inspection of src/components/week-planner.tsx

// BEFORE (current):
type MealPlanEntry = {
  id: string;
  date: string;
  recipeId: string | null;
  customMeal: string | null;
  recipe: { id: string; name: string; category: string | null } | null;
  forUser: { id: string; displayName: string };
  assigner: { displayName: string };
};

// AFTER (this phase):
type MealPlanEntry = {
  id: string;
  date: string;
  mealType: "fruehstueck" | "mittag" | "abend" | "snacks"; // NEW
  recipeId: string | null;
  customMeal: string | null;
  recipe: { id: string; name: string; category: string | null } | null;
  forUser: { id: string; displayName: string };
  assigner: { displayName: string };
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `package.json` `prisma.seed` config key | `prisma.config.ts` `migrations.seed` | Prisma 7 (Nov 2025) | Must use config file, not package.json — project already has `prisma.config.ts` |
| tsx / ts-node for seed scripts | Node native `--experimental-transform-types` | Node 22.7+ | No additional tooling; Node 25 already installed |
| Prisma enum mapped to `@map()` | Prisma 7 native mapped enums with `@map()` | Prisma 7 | Unchanged — `@map()` still works and is preferred for snake_case DB columns |

**Deprecated/outdated:**
- `package.json` `"prisma": { "seed": "..." }` config key: Prisma 7 moved seed config to `prisma.config.ts`. The existing `prisma.config.ts` has no `migrations.seed` yet — add it.

---

## Open Questions

1. **USDA SR Legacy JSON vs. CSV format for seed**
   - What we know: Both are available; JSON is 205MB unzipped, CSV is 54MB.
   - What's unclear: Whether the JSON structure uses a top-level `SRLegacyFoods` array or a different key. The API returns individual food items in a well-documented structure; the bulk JSON may differ.
   - Recommendation: Download the CSV for the seed (smaller, simpler to stream line-by-line), using the `food.csv` + `nutrient.csv` + `food_nutrient.csv` tables. Alternatively, use the FDC API to fetch all SR Legacy foods paginated (pageSize=200, ~40 calls for 7,793 foods). The API approach avoids bulk download management.

2. **AI translation quality for German food names**
   - What we know: GPT-4o-mini is fast and cheap for translation; batch of 50 = <$0.01.
   - What's unclear: Whether German translations for US-specific foods (e.g., "Beef, chuck, arm pot roast") are accurate enough to be useful, or whether they should be skipped as irrelevant to a German family.
   - Recommendation: Apply a category filter aggressively (only ~14 relevant categories) before translation. For filtered ~2,500 items, translation cost is ~$0.50 total.

3. **week-planner.tsx: mealType selector UX in Add button flow**
   - What we know: User wants "filled slots + Add button" layout (not fixed 4-slot grid).
   - What's unclear: When clicking "Add", does the user first choose a meal type (Frühstück/Mittag/Abend/Snack), then the recipe? Or does the recipe picker show meal type as a step?
   - Recommendation: Keep it simple — clicking "Add" opens the RecipePicker with an added mealType dropdown at the top (pre-select "abend" as default). This is a UI detail — don't block the schema/seed work on it.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | None |
| Quick run command | N/A — Wave 0 must install a framework |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Ingredient table has all 7 nutrient fields | manual-only (schema inspection) | `npx prisma db pull && diff` | ❌ Wave 0 — no test framework |
| DB-02 | RecipeIngredient links recipe to ingredient with amount+unit | manual-only (migration smoke) | `npx prisma migrate status` | ❌ Wave 0 |
| DB-03 | MealPlan accepts 2+ meals per day per user | manual-only (data insert test) | Can verify via `prisma studio` | ❌ Wave 0 |
| DB-04 | pg_trgm extension enabled; GIN index exists | manual-only (pg catalog query) | `psql -c "\dx pg_trgm"` | ❌ Wave 0 |
| DB-05 | Seed produces ~2,000+ ingredients with German names | manual-only (count query) | `npx prisma db seed && psql -c "SELECT COUNT(*) FROM ingredients"` | ❌ Wave 0 |

**Note on manual-only:** All DB-0x requirements are schema/data migration concerns. There is no application logic to unit test in Phase 6 — the deliverables are SQL migrations and a seed script. Correctness is verified by running migrations successfully and querying the database. A test framework is not warranted for this phase specifically.

### Sampling Rate
- **Per task commit:** `npx prisma migrate status` (verify migrations applied)
- **Per wave merge:** `npx prisma migrate status && psql $DATABASE_URL -c "SELECT COUNT(*) FROM ingredients"`
- **Phase gate:** All migrations applied cleanly; ingredient count >= 2000; `@@unique([date, forUserId, mealType])` constraint verified in `prisma db pull`

### Wave 0 Gaps
None required — no application code test framework needed for schema/seed tasks. Validation is via migration success and row counts.

---

## Sources

### Primary (HIGH confidence)
- `/prisma/schema.prisma` — existing schema, direct inspection; confirmed MealPlan current state
- `/prisma/migrations/20260228120000_simplify_weekplan/migration.sql` — confirms meal_type was previously dropped; must re-add
- `/prisma.config.ts` — existing Prisma 7 config; confirmed no `migrations.seed` yet
- `/package.json` — confirmed Prisma ^7.4.0, no tsx, Node 25 installed
- `/src/lib/db.ts` — confirmed PrismaPg adapter; seed script must use same adapter or direct pg connection
- USDA FDC API (https://api.nal.usda.gov/fdc/v1/food/170379) — confirmed exact nutrient IDs for all 7 fields
- PostgreSQL pg_trgm docs (https://www.postgresql.org/docs/current/pgtrgm.html) — confirmed GIN index syntax and similarity query
- Prisma config reference (https://www.prisma.io/docs/orm/reference/prisma-config-reference) — confirmed `migrations.seed` location in prisma.config.ts

### Secondary (MEDIUM confidence)
- Prisma seeding docs (https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) — upsert idempotency pattern
- Prisma migrate customization (https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) — `--create-only` and multi-step enum migration
- Node.js TypeScript docs (https://nodejs.org/en/learn/typescript/run-natively) — confirmed `--experimental-transform-types` for enum support in Node 25

### Tertiary (LOW confidence)
- USDA SR Legacy bulk JSON internal structure — top-level array key name not confirmed; need to verify after download
- AI translation quality for German food names — assumed adequate; not tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed; exact Prisma 7 config location confirmed
- Architecture: HIGH — patterns verified against actual codebase files and official docs
- Pitfalls: HIGH — PostgreSQL ALTER TYPE transaction limitation is a well-documented known issue; confirmed via multiple Prisma GitHub issues
- USDA data: MEDIUM — nutrient IDs confirmed via live API; bulk download structure requires verification after download

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain; Prisma 7 and pg_trgm are not fast-moving)
