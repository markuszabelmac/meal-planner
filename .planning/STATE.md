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

## Accumulated Context

### Decisions

- **v1.1**: Additive schema approach — keep `Recipe.ingredients` freetext field as fallback alongside new structured `RecipeIngredient` table; never remove existing data
- **v1.1**: Use `pg_trgm` for server-side fuzzy matching instead of client-side library (avoids shipping full ingredient list to client)
- **v1.1**: Import USDA SR Legacy only (~9,000 entries, not full 400k) to keep match quality high
- **v1.1**: Add German name aliases to `Ingredient` to handle German-language ingredient text matching against English USDA names
- **v1.1**: MealPlan unique constraint `@@unique([date, forUserId])` must be fixed in Phase 6 to allow 2 meals/day before history is built

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 6**: MealPlan unique constraint migration requires care if existing MealPlan rows exist in production — inspect before migrating
- **Phase 6**: German food coverage in USDA SR Legacy is limited (Quark, Schwarzbrot, etc. likely missing) — decide on alias strategy or hand-curated supplement during Phase 6 planning
- **Phase 9**: Fuzzy match confidence threshold needs calibration — wrong ingredient match (e.g. "Sahne" → "Saure Sahne") causes silent nutrition errors; never auto-link below 0.9 similarity

## Session Continuity

Last session: 2026-03-15
Stopped at: Roadmap created; requirements defined; ready to plan Phase 6
Resume file: None
