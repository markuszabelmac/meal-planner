---
phase: 06-schema-data-foundation
plan: 01
subsystem: database
tags: [prisma, postgresql, pg_trgm, gin-index, nutrition, enum, migration]

# Dependency graph
requires: []
provides:
  - Ingredient model with 7 nutrient fields and fdcId for idempotent USDA seeding
  - RecipeIngredient model linking recipes to structured ingredients with unit and estimated nutrition
  - MealType enum (fruehstueck, mittag, abend, snacks) enabling 2+ meals per day
  - Unit enum (g, kg, ml, l, stueck, el, tl, prise) for ingredient quantities
  - pg_trgm extension + GIN indexes on ingredients.name and ingredients.name_en for fuzzy search
  - unitToGrams() conversion utility for nutrition calculation
  - Updated MealPlan unique constraint [date, forUserId, mealType]
  - Migration SQL with data migration (existing rows set to mealType=abend)
affects: [07-seed-data, 08-nutrition-calculation, 09-recipe-ingredient-linking, 10-nutrition-ui]

# Tech tracking
tech-stack:
  added: [pg_trgm PostgreSQL extension]
  patterns: [MealType nullable-then-NOT-NULL migration pattern, GIN trigram index for fuzzy search, Unit enum with null sentinel for open-ended quantities]

key-files:
  created:
    - prisma/migrations/20260315000000_add_nutrition_schema/migration.sql
    - src/lib/units.ts
  modified:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/app/api/meal-plans/route.ts
    - src/generated/prisma/ (regenerated)

key-decisions:
  - "Migration adds meal_type as nullable, backfills existing rows to 'abend', then sets NOT NULL — avoids DEFAULT constraint issues with existing data"
  - "pg_trgm GIN indexes on both name (German) and name_en (English) fields enables fuzzy matching against USDA English names and user-input German text"
  - "unitToGrams returns null for 'stueck' (not 0 or error) — forces callers to handle the AI-estimation fallback explicitly in Phase 9"
  - "MealPlan API route defaults mealType to 'abend' when not specified — backward compatible with existing UI callers"

patterns-established:
  - "Enum migration pattern: add nullable column → backfill data → ALTER SET NOT NULL (avoids DEFAULT with enum types)"
  - "Unit conversion: fixed factor map with null sentinel for uncalculable units (stueck)"

requirements-completed: [DB-01, DB-02, DB-03, DB-04]

# Metrics
duration: 22min
completed: 2026-03-15
---

# Phase 06 Plan 01: Schema & Data Foundation Summary

**Prisma schema extended with Ingredient + RecipeIngredient models, MealType/Unit enums, pg_trgm GIN indexes, and MealPlan migrated to support multiple meals per day**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-03-15T15:54:36Z
- **Completed:** 2026-03-15T16:16:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added Ingredient model with 7 nutrient fields (kcal, protein, fat, satFat, carbs, sugar, fiber), German name as primary field, fdcId for idempotent USDA seed
- Added RecipeIngredient model with Unit enum, estimated nutrition fallback fields for Phase 9 AI estimation
- Fixed MealPlan unique constraint from `[date, forUserId]` to `[date, forUserId, mealType]` enabling 2+ meals per day
- Wrote migration SQL with safe nullable-then-NOT-NULL enum migration, pg_trgm extension, and GIN indexes
- Created `src/lib/units.ts` with UNIT_TO_GRAMS map and unitToGrams() helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema, migration, and API route update** - `e326b63` (feat)
2. **Task 2: Unit conversion utility** - `53dd5ee` (feat)

**Plan metadata:** (pending — docs commit)

## Files Created/Modified

- `prisma/schema.prisma` - Added MealType enum, Unit enum, Ingredient model, RecipeIngredient model; updated MealPlan unique constraint
- `prisma/migrations/20260315000000_add_nutrition_schema/migration.sql` - Handwritten migration with pg_trgm, GIN indexes, nullable→NOT NULL enum migration
- `prisma.config.ts` - Added seed command (`node --experimental-transform-types prisma/seed.ts`)
- `src/lib/units.ts` - UNIT_TO_GRAMS constant and unitToGrams() helper, re-exports Unit type
- `src/app/api/meal-plans/route.ts` - Updated upsert composite key to `date_forUserId_mealType`, added mealType parameter (defaults to 'abend')
- `src/generated/prisma/` - Regenerated with new enums and models

## Decisions Made

- Migration uses nullable-first approach for `meal_type` column (add nullable → backfill → set NOT NULL) because PostgreSQL requires an explicit DEFAULT when adding NOT NULL columns to populated tables, and Prisma enum types cannot be used as column defaults easily
- `unitToGrams` returns `null` (not 0 or throws) for `stueck` — callers must handle this case, which forces explicit AI-estimation fallback implementation in Phase 9
- `mealType` defaults to `'abend'` in the API route when not supplied — this keeps existing UI callers (week planner) working unchanged until they are updated in Phase 10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated meal-plans API route for new composite key**
- **Found during:** Task 1 (schema update)
- **Issue:** TypeScript compilation failed because `date_forUserId` unique key no longer exists after adding `mealType` to the constraint; `mealType` also required in create operations
- **Fix:** Updated both POST and PUT handlers to use `date_forUserId_mealType` composite key, added `mealType` parameter (defaults to `'abend'`), added `mealType` to `orderBy` clause in GET
- **Files modified:** src/app/api/meal-plans/route.ts
- **Verification:** `npx tsc --noEmit` passes without errors
- **Committed in:** e326b63 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed units.ts import path to use /client suffix**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `@/generated/prisma` has no index.ts; correct path is `@/generated/prisma/client` (matches pattern in src/lib/db.ts)
- **Fix:** Changed import from `@/generated/prisma` to `@/generated/prisma/client`
- **Files modified:** src/lib/units.ts
- **Verification:** `npx tsc --noEmit` passes without errors
- **Committed in:** 53dd5ee (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation to succeed. No scope creep — API route update is explicitly mentioned in CONTEXT.md as a required integration point.

## Issues Encountered

**Database not available during execution:** Docker daemon was not running, so `prisma migrate dev` and `prisma migrate status` could not connect to the database. The migration SQL was written manually based on schema diff knowledge, following the established migration patterns in the codebase. The migration will be applied when the user runs `docker compose up` and `npx prisma migrate dev`.

Note: `prisma validate` passed (no DB connection needed) and `prisma generate` succeeded, producing the updated Prisma client with new types.

## User Setup Required

Before the migration can be applied, start Docker and run the migration:

```bash
# Start the database
docker compose up -d  # or however Docker is started in this project

# Apply the migration (will also seed if prisma/seed.ts exists)
npx prisma migrate dev
```

The migration will:
1. Enable pg_trgm extension
2. Create ingredients and recipe_ingredients tables
3. Add meal_type column to meal_plans (nullable, then backfill to 'abend', then NOT NULL)
4. Drop old unique constraint and add new 3-field constraint

## Next Phase Readiness

- Schema foundation complete — Phase 7 (USDA seed data) can proceed with Ingredient model and fdcId for idempotent seeding
- pg_trgm and GIN indexes will be active after migration — Phase 9 fuzzy matching is unblocked
- unitToGrams() utility ready for Phase 8 nutrition calculation
- MealPlan API updated and backward compatible — existing week planner UI unaffected

---
*Phase: 06-schema-data-foundation*
*Completed: 2026-03-15*
