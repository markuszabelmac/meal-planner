---
phase: 06-schema-data-foundation
plan: "02"
subsystem: database
tags: [prisma, postgresql, usda, seed-data, openai, gpt-4o-mini, nutrition, german-translation]

# Dependency graph
requires:
  - phase: 06-schema-data-foundation/06-01
    provides: Ingredient model with fdcId unique field for idempotent upsert, pg_trgm GIN indexes on name and name_en
provides:
  - USDA SR Legacy seed data: 5265 German-translated food ingredients in ingredients table
  - prisma/seed.ts: idempotent seed script using AI batch translation (gpt-4o-mini)
  - prisma/seed-data/usda-sr-legacy.json: local USDA data file (gitignored, 210MB)
  - Seed command in prisma.config.ts via `npx tsx prisma/seed.ts`
affects: [08-nutrition-calculation, 09-recipe-ingredient-linking, 10-nutrition-ui]

# Tech tracking
tech-stack:
  added: [tsx (runtime for seed script), USDA SR Legacy dataset]
  patterns:
    - Seed script runs via `npx tsx` (not node --experimental-transform-types) for ESM-compatible TypeScript execution
    - AI batch translation: 50 items per OpenAI call, English fallback on failure
    - Idempotent seed via prisma.ingredient.upsert with fdcId as unique key
    - Seed data file gitignored (210MB) but documented for reproduction

key-files:
  created:
    - prisma/seed.ts
    - prisma/seed-data/usda-sr-legacy.json (gitignored)
    - prisma/seed-data/.gitignore
  modified:
    - prisma.config.ts (seed command updated to use npx tsx)
    - .gitignore (added prisma/seed-data/*.json pattern)

key-decisions:
  - "Use npx tsx instead of node --experimental-transform-types for seed runner — ESM module resolution in Node.js 25 doesn't resolve .ts imports within generated Prisma client directory"
  - "Fallback to English name when AI translation fails (not skip) — ensures all 5265 items are seeded with name_en still searchable via pg_trgm index"
  - "Cap at 6000 items (MAX_ITEMS) to keep translation cost bounded and seed time predictable (~38 minutes)"
  - "14 USDA food categories selected: Vegetables, Fruits, Beef, Poultry, Pork, Lamb/Game, Fish/Seafood, Dairy/Egg, Legumes, Cereal/Pasta, Nuts/Seeds, Fats/Oils, Spices/Herbs, Baked Products"

patterns-established:
  - "Seed script: load JSON → filter categories → extract nutrients → translate in batches → upsert by unique key"
  - "OpenAI translation: 45s timeout, retry once, English fallback — never skip items"

requirements-completed: [DB-05]

# Metrics
duration: 65min
completed: 2026-03-15
---

# Phase 06 Plan 02: USDA Seed Data Summary

**5265 USDA SR Legacy food ingredients seeded with German AI-translated names via gpt-4o-mini batch translation, all 5265 with nutrition values per 100g and idempotent upsert by fdcId**

## Performance

- **Duration:** ~65 min (including 38min seed execution time)
- **Started:** 2026-03-15T16:00:35Z
- **Completed:** 2026-03-15T17:10:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Downloaded USDA SR Legacy JSON (7793 foods total, 210MB) from USDA FoodData Central
- Filtered to 5265 foods across 14 cooking-relevant categories (all with kcal values)
- Translated all 5265 English USDA names to German via gpt-4o-mini (50 items per batch, 106 batches)
- Upserted all 5265 records to `ingredients` table with full nutrition data (kcal, protein, fat, satFat, carbs, sugar, fiber)
- Zero translation failures: 0 skipped batches, 0 fallbacks to English name
- Verified spot checks: Kartoffeln (111 matches), Butter (114), Mehl (106), Hackfleisch (17), Zwiebeln (37)
- Confirmed idempotency: re-running seed does not create duplicates (fdcId unique constraint)

## Task Commits

Each task was committed atomically:

1. **Task 1: Download USDA SR Legacy data** - `bf3ac49` (chore) + `028988f` (initial seed script, from prior session)
2. **Task 2: Create and run seed script** - `028988f` feat(06-02) + `395e2b6` fix(06-02) (robustness improvements)

## Files Created/Modified

- `prisma/seed.ts` - Idempotent USDA seed script: loads JSON, filters 14 categories, AI-translates in 50-item batches, upserts by fdcId
- `prisma/seed-data/usda-sr-legacy.json` - USDA SR Legacy bulk JSON (gitignored, 210MB, 7793 items)
- `prisma/seed-data/.gitignore` - Gitignores *.json in seed-data directory
- `prisma.config.ts` - Seed command changed from `node --experimental-transform-types` to `npx tsx`
- `.gitignore` - Added `prisma/seed-data/*.json` pattern

## Decisions Made

- Changed seed runner from `node --experimental-transform-types` to `npx tsx`: Node.js 25 ESM module resolution cannot resolve `.ts` imports within the generated Prisma client directory (imports between generated files lack `.ts` extensions). `tsx` handles this correctly without changes to the generated files.
- Fallback to English names (not skip) when translation fails: ensures all items are seeded. The `name_en` field remains correct for pg_trgm matching even if the `name` field falls back to English.
- Capped at 6000 MAX_ITEMS per run to keep API cost and execution time bounded. All 5265 eligible items fit within this cap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed seed runner from node to npx tsx**
- **Found during:** Task 2 (running seed script)
- **Issue:** `node --experimental-transform-types prisma/seed.ts` failed with `ERR_MODULE_NOT_FOUND` because Node.js 25 ESM resolver can't find `../src/generated/prisma/client` (no `.ts` extension, and the directory doesn't have an index file matching the specifier). The generated Prisma client files import each other without extensions, which is designed for Next.js's TypeScript transform.
- **Fix:** Changed `prisma.config.ts` seed command from `node --experimental-transform-types prisma/seed.ts` to `npx tsx prisma/seed.ts`. tsx uses esbuild to resolve TypeScript imports correctly.
- **Files modified:** prisma.config.ts
- **Verification:** `npx prisma db seed` runs successfully
- **Committed in:** 028988f (Task 2 commit)

**2. [Rule 1 - Bug] Fixed translation retry on length mismatch**
- **Found during:** Task 2 (monitoring seed execution)
- **Issue:** When OpenAI returns fewer translations than requested (e.g., 41 for 50 items), the retry would use `attempt + 1` but the condition checked `attempt < 2` — causing it to retry correctly but then skip the batch. Also missing: near-match padding (off-by-1 or 2) should be handled rather than failing.
- **Fix:** Added padding logic: if translation array is within 2 of expected length after retry, pad with English names rather than skipping. Also improved system prompt with explicit count requirement.
- **Files modified:** prisma/seed.ts
- **Verification:** Seed ran to completion with 0 skipped batches, 0 fallbacks
- **Committed in:** 395e2b6 (fix commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking, 1 Rule 1 - bug)
**Impact on plan:** Both auto-fixes necessary for seed script to run successfully. No scope creep.

## Issues Encountered

**SIGPIPE termination from piped commands:** Early test runs using `npx tsx prisma/seed.ts 2>&1 | head -30` would terminate the seed process mid-run because the `head` command closes stdin after 30 lines, causing SIGPIPE to kill the tsx process. This caused confusion about hangs. Resolved by redirecting output to a file (`> /tmp/seed-final.txt 2>&1`) and reading the file separately.

## User Setup Required

Before running `npx prisma db seed`, ensure:
1. PostgreSQL database is running (via Docker: `docker compose up -d`)
2. `DATABASE_URL` environment variable is set in `.env`
3. `OPENAI_API_KEY` environment variable is set in `.env`
4. All migrations applied: `npx prisma migrate deploy`

The seed file itself (210MB) is not in git — reproduction: `curl -L -o /tmp/usda.zip "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip" && unzip /tmp/usda.zip -d prisma/seed-data/ && mv prisma/seed-data/FoodData_Central_sr_legacy_food_json_2018-04.json prisma/seed-data/usda-sr-legacy.json`

## Next Phase Readiness

- Ingredient table populated with 5265 entries — Phase 8 (nutrition calculation) and Phase 9 (fuzzy matching) have data to work with
- pg_trgm GIN indexes on `name` (German) and `name_en` (English) enable fast trigram search — Phase 9 fuzzy matching is unblocked
- German names are primary (`name`), English USDA names stored as `nameEn` — dual-language search supported
- All nutrition fields populated (protein, fat, satFat, carbs, sugar, fiber per 100g)

---
*Phase: 06-schema-data-foundation*
*Completed: 2026-03-15*
