# Technology Stack — Nährstoffe Milestone

**Project:** Meal Planner v1.1 Nährstoffe
**Researched:** 2026-03-15
**Scope:** NEW additions only. Existing stack (Next.js 16, React 19, Tailwind CSS 4, PostgreSQL, Prisma 7, NextAuth 5, OpenAI SDK) is not re-evaluated.

---

## What This Milestone Needs

Four new technical capabilities:

1. **Seeding a local ingredient database from USDA FoodData Central** (one-time + manual refresh)
2. **Fuzzy ingredient matching** (typing "Hähnchen" → finds "Hähnchenbrustfilet")
3. **Nutrition calculation** (per-portion math from `RecipeIngredient` rows)
4. **Nutrition history views** (charts/tables showing daily/weekly kcal + macros)

---

## Recommended Additions

### 1. USDA FoodData Central — Bulk Download, Not Runtime API

**Approach:** Download the "Foundation Foods" JSON dataset once, transform, seed via Prisma script.

**Why bulk download over runtime API calls:**
- App is self-hosted on a VPS with no guaranteed uptime or API quota
- USDA API rate limits (1,000 req/hour on free tier) would throttle any seed loop
- The ingredient DB is read-heavy and static — no need for live lookups
- Eliminates external dependency in production

**Dataset choice:** Foundation Foods (`FoodData_Central_Foundation_food_json_YYYY-MM-DD.zip`)
- ~1,200 foods, highest quality nutritional data with scientific citations
- Covers the main categories needed (meats, vegetables, grains, dairy, fats)
- SR Legacy (~8,800 foods) is an alternative if coverage proves insufficient — same JSON format, same seed script

**Download URL (free, no auth):** `https://fdc.nal.usda.gov/download-datasets.html`
**Confidence:** HIGH — USDA FoodData Central is the official USDA database, publicly documented.

**Seed script location:** `prisma/seed-ingredients.ts`
- Runs once via `ts-node` or `npx tsx`
- Transforms USDA nutrient IDs to the schema fields (kcal=1008, protein=1003, fat=1004, saturated fat=1258, carbs=1005, sugars=2000, fiber=1079)
- Upserts on name to allow re-runs without duplicates

**No new npm package needed.**

---

### 2. Fuzzy Ingredient Matching — PostgreSQL `pg_trgm`

**Recommendation:** Use the `pg_trgm` PostgreSQL extension via raw Prisma query. No new npm library.

**Why not Fuse.js or similar client-side libraries:**
- The ingredient table will have 1,000–9,000 rows — pulling all to client for filtering is wasteful
- `pg_trgm` runs server-side, is production-grade, and handles German umlauts correctly with UTF-8
- Prisma 7 already supports raw queries via `prisma.$queryRaw`
- No new dependency to maintain

**Setup:**
```sql
-- Run once in a migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ingredients_name_trgm_idx ON ingredients USING gin (name gin_trgm_ops);
```

**Query pattern:**
```typescript
const matches = await prisma.$queryRaw<Ingredient[]>`
  SELECT *, similarity(name, ${query}) AS score
  FROM ingredients
  WHERE similarity(name, ${query}) > 0.25
  ORDER BY score DESC
  LIMIT 10
`;
```

**Confidence:** HIGH — `pg_trgm` is a standard bundled PostgreSQL extension, ships with all PostgreSQL installations including the VPS's existing PostgreSQL instance.

**Fallback for autocomplete (client-side):** For the ingredient management page where the full list is already loaded, `Array.filter` with `.toLowerCase().includes()` is sufficient — no library.

---

### 3. Nutrition Calculation — No New Library

All nutrition math is simple arithmetic on `RecipeIngredient` rows:

```
nutrientPerPortion = sum(ingredient.amount * ingredient.nutrientPer100g / 100) / recipe.servings
```

This is a utility function in `src/lib/nutrition.ts` — no library needed. The values are already stored as `Float` in PostgreSQL; calculation happens server-side in the API route or as a Prisma computed query.

**Confidence:** HIGH — straightforward arithmetic, no external dependency warranted.

---

### 4. Nutrition History Charts — Recharts

**Recommendation:** `recharts` ^2.15

**Why Recharts:**
- Most widely used React charting library, well-maintained
- Composable, declarative API that fits React Server Component patterns (charts are client components)
- Covers all needed chart types: `BarChart` for daily macros, `ResponsiveContainer` for mobile layout
- TypeScript types included (`@types/recharts` is bundled since v2.x)
- Tree-shakeable — only the chart components used are bundled

**Why not alternatives:**
| Alternative | Reason to skip |
|---|---|
| Victory | Heavier (~300KB), less community momentum |
| Chart.js / react-chartjs-2 | Imperative API, harder to compose with React state |
| Nivo | Beautiful but very large bundle, overkill for simple bar charts |
| D3 directly | Too low-level for this use case, higher maintenance cost |
| CSS-only bars | Sufficient for kcal-only display, but spec requires 7-macro breakdown — CSS approach becomes unwieldy |

**Note on bundle size:** Recharts is ~150KB gzipped. Given this is an internal family PWA, bundle size is not a critical concern. The nutrition views are behind a route segment, so they don't affect initial load.

**Confidence:** MEDIUM — Recharts v2.x is well-established as of training cutoff (Aug 2025). Version 2.15 is the conservative pin; verify latest with `npm info recharts version` before installing.

---

### 5. Unit Conversion — Hand-rolled Utility

The spec lists units: `g, ml, Stück, EL, TL, Tasse, Prise`. Conversion to grams for nutrition calculation needs a lookup table, not a library.

**Approach:** A `src/lib/units.ts` file with a typed map:

```typescript
type UnitKey = "g" | "ml" | "EL" | "TL" | "Tasse" | "Stück" | "Prise";

const TO_GRAMS: Record<UnitKey, number | null> = {
  g: 1,
  ml: 1,         // approximate (water density)
  EL: 15,        // tablespoon ~15g
  TL: 5,         // teaspoon ~5g
  Tasse: 240,    // cup ~240ml
  Stück: null,   // ingredient-specific, skip calculation
  Prise: 0.5,    // pinch ~0.5g
};
```

When `toGrams` returns `null` (unit is "Stück"), the calculation falls back to AI-estimated values.

**No new package needed.**

---

## What NOT to Add

| Temptation | Why to skip |
|---|---|
| `fuse.js` | pg_trgm is already on the stack (PostgreSQL), no client library needed |
| `convert-units` npm package | 6 units max, hand-rolled map is simpler and typed |
| OpenFoodFacts API | Runtime external dependency, inconsistent data quality, German labels vary |
| `zod` for nutrition validation | Project has no existing zod usage; Prisma types + TypeScript are sufficient |
| Redis for caching ingredient search | Premature for a 4-person family app; PostgreSQL + index is fast enough |
| `react-hook-form` for ingredient forms | Simple controlled inputs match existing patterns in this codebase |

---

## Installation

```bash
# Only new production dependency
npm install recharts

# No new dev dependencies needed
# pg_trgm is a PostgreSQL built-in extension — no npm package
```

---

## Integration Points with Existing Stack

| New Capability | Integrates With | How |
|---|---|---|
| Ingredient seed script | Prisma 7 + PostgreSQL | `prisma.$executeRaw` for extension, `prisma.ingredient.upsert` for seed |
| Fuzzy search API route | Prisma 7 `$queryRaw` | Raw SQL with pg_trgm similarity function |
| Nutrition calculation | Existing Recipe API routes | New `src/lib/nutrition.ts` utility, called in `GET /api/recipes/[id]` |
| AI ingredient extraction | Existing OpenAI SDK usage | Extend prompt in `import-url` and `save-recipe` routes to return structured `{name, amount, unit}[]` |
| Nutrition history page | Existing MealPlan table | New `GET /api/nutrition/history` route joins MealPlan → Recipe → RecipeIngredient → Ingredient |
| Charts | React 19 client components | Recharts `<BarChart>` as `"use client"` components in new `src/app/(app)/nutrition/` route |

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| USDA bulk download approach | HIGH | Official USDA public dataset, no API key required for download |
| pg_trgm for fuzzy match | HIGH | Standard PostgreSQL built-in, well-documented |
| No unit-conversion library | HIGH | 6-unit scope clearly does not warrant a package |
| Recharts version | MEDIUM | v2.x confirmed stable as of Aug 2025; verify exact latest version before install |
| AI nutrition estimation via OpenAI | MEDIUM | Existing OpenAI SDK pattern in codebase; prompt engineering for structured nutrient output is straightforward but untested |
| USDA dataset German food coverage | LOW | Foundation Foods is US-centric; German ingredients like "Schnitzel" or "Quark" may be missing — users will need to add manually or use AI estimation as fallback |

---

## Open Questions

1. **USDA German coverage gap:** Foundation Foods covers ~1,200 mostly US foods. German staples (Quark, Leberkäse, Schwarzbrot) will be missing. The AI-estimation fallback in the spec handles this, but the seed data quality for a German family should be validated after seeding. SR Legacy (~8,800 foods) may have better coverage — evaluate after initial seed.

2. **Recharts exact version:** Cannot verify latest Recharts version without npm access. Pin to `^2.15` as conservative estimate and update after running `npm info recharts version`.

3. **"Stück" unit ambiguity:** Per-piece nutrition calculation is impossible without a density/weight mapping per ingredient (e.g., "1 Stück Ei" = 60g). The utility returns `null` for Stück, triggering AI estimation. This is acceptable for MVP but should be documented as a known limitation in the UI.

---

## Sources

- USDA FoodData Central documentation: training data (HIGH confidence for API/dataset structure)
- PostgreSQL pg_trgm documentation: well-established built-in extension (HIGH confidence)
- Recharts: training data through Aug 2025 (MEDIUM — version needs live verification)
- Existing codebase patterns: `src/app/api/recipes/import-url/route.ts`, `prisma/schema.prisma`
