---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Nährstoffe
status: planning
stopped_at: Completed 07-01-PLAN.md
last_updated: "2026-03-15T19:33:03.985Z"
last_activity: 2026-03-15 — Roadmap created for milestone v1.1 Nährstoffe (phases 6-10)
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Gemeinsame wöchentliche Essensplanung für die Familie
**Current focus:** Phase 6 — Schema & Data Foundation (v1.1 Nährstoffe)

## Current Position

Phase: 6 of 10 (Schema & Data Foundation)
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-15 — Roadmap created for milestone v1.1 Nährstoffe (phases 6-10)

Progress: [██████░░░░] 50% (v1.0 complete; v1.1 not started)

## Performance Metrics

**Velocity:**
- Total plans completed: — (v1.0 shipped before metrics tracking)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-5) | — | — | — |
| Phase 06-schema-data-foundation P06-01 | 22 | 2 tasks | 5 files |
| Phase 06-schema-data-foundation P02 | 65 | 2 tasks | 4 files |
| Phase 07-ingredient-admin-ui P01 | 3 | 2 tasks | 6 files |

## Accumulated Context

### Decisions

- **v1.1**: Additive schema approach — keep `Recipe.ingredients` freetext field as fallback alongside new structured `RecipeIngredient` table; never remove existing data
- **v1.1**: Use `pg_trgm` for server-side fuzzy matching instead of client-side library (avoids shipping full ingredient list to client)
- **v1.1**: Import USDA SR Legacy only (~9,000 entries, not full 400k) to keep match quality high
- **v1.1**: Add German name aliases to `Ingredient` to handle German-language ingredient text matching against English USDA names
- **v1.1**: MealPlan unique constraint `@@unique([date, forUserId])` must be fixed in Phase 6 to allow 2 meals/day before history is built
- [Phase 06-schema-data-foundation]: Migration adds meal_type as nullable, backfills existing rows to 'abend', then sets NOT NULL — avoids DEFAULT constraint issues with Prisma enum types on populated tables
- [Phase 06-schema-data-foundation]: unitToGrams returns null for 'stueck' (not 0 or throws) — forces callers to implement AI-estimation fallback explicitly in Phase 9
- [Phase 06-schema-data-foundation]: MealPlan API route defaults mealType to 'abend' when not specified — backward compatible with existing week planner UI
- [Phase 06-schema-data-foundation]: MealType selector shown always in RecipePicker (not only on details step) — user can change type before browsing recipes
- [Phase 06-schema-data-foundation]: mealType is explicit 3rd arg to onSelect/assignMeal (not folded into options) for type-safety and clarity
- [Phase 06-schema-data-foundation]: Use npx tsx instead of node --experimental-transform-types for seed runner — ESM module resolution in Node.js 25 cannot resolve .ts imports within generated Prisma client
- [Phase 06-schema-data-foundation]: Seed script uses English name fallback (not skip) when AI translation fails — ensures all items seeded with nameEn still searchable
- [Phase 07-ingredient-admin-ui]: Prisma import path is @/generated/prisma/client not root directory — matches existing meal-plans/route.ts pattern
- [Phase 07-ingredient-admin-ui]: DELETE /api/ingredients/[id] returns detachedRecipes count so callers can warn if recipes lose structured ingredient link

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 6**: MealPlan unique constraint migration requires care if existing MealPlan rows exist in production — inspect before migrating
- **Phase 6**: German food coverage in USDA SR Legacy is limited (Quark, Schwarzbrot, etc. likely missing) — decide on alias strategy or hand-curated supplement during Phase 6 planning
- **Phase 9**: Fuzzy match confidence threshold needs calibration — wrong ingredient match (e.g. "Sahne" → "Saure Sahne") causes silent nutrition errors; never auto-link below 0.9 similarity

## Session Continuity

Last session: 2026-03-15T19:33:03.983Z
Stopped at: Completed 07-01-PLAN.md
Resume file: None
