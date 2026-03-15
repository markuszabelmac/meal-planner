# Phase 6: Schema & Data Foundation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the nutritional database schema (Ingredient + RecipeIngredient tables), fix the MealPlan model to support multiple meals per day, enable pg_trgm fuzzy matching, and seed the ingredient database from filtered USDA SR Legacy data with German translations. The existing Recipe.ingredients freetext field stays as a fallback.

</domain>

<decisions>
## Implementation Decisions

### MealPlan Migration
- Re-add `mealType` as an enum with 4 values: `fruehstueck`, `mittag`, `abend`, `snacks`
- Change unique constraint to `@@unique([date, forUserId, mealType])`
- Migrate existing MealPlan entries: set all to `abend` (Abendessen)
- Week planner UI: show only filled slots + an "Add" button per day (not all 4 slots fixed)

### Deutsche Aliase
- Ingredient table has German name as primary field (`name`) and English USDA name as alias field (`nameEn`)
- Fuzzy matching (pg_trgm) searches against both German and English name fields
- GIN index on both name fields for performance

### USDA Seed
- Filter USDA SR Legacy to relevant food categories (~2-3k entries): meat, vegetables, fruit, grains, dairy, oils, spices, nuts, legumes
- AI translates English USDA names to German during seed generation (one-time cost)
- Implement as `prisma db seed` — idempotent and repeatable
- Users can add fully custom ingredients with their own nutrition data (not restricted to USDA)

### Einheiten-Handling
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma`: Existing Recipe, MealPlan, User models — new models follow same patterns
- `src/app/api/meal-plans/route.ts`: Uses upsert with composite key `date_forUserId` — must be updated for new 3-field composite key
- `src/components/week-planner.tsx`: Currently renders 2 slots per day — must adapt to dynamic slot rendering

### Established Patterns
- Prisma migrations in `prisma/migrations/` — new schema changes follow same migration pattern
- API routes use session-based auth check as first step
- All models use `cuid()` for primary keys
- Database field names use snake_case via `@map()`

### Integration Points
- `src/app/api/meal-plans/route.ts`: POST/PUT/DELETE need `mealType` parameter added
- `src/components/week-planner.tsx`: Slot rendering needs to be dynamic (filled + add button)
- `prisma/schema.prisma`: New Ingredient + RecipeIngredient models, MealPlan mealType field
- `package.json`: Add `prisma.seed` configuration pointing to seed script

</code_context>

<specifics>
## Specific Ideas

- MealPlan migration was previously simplified (meal_type removed on 2026-02-28 in `simplify_weekplan` migration) — now adding it back with more types
- The user wants the planer UI to stay compact: only show filled slots with an add button, not all 4 slots permanently visible
- Enum should be designed to be easily extensible (Prisma enum can be extended via migrations)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-schema-data-foundation*
*Context gathered: 2026-03-15*
