# Project Research Summary

**Project:** Meal Planner — Nährstoffe Milestone (v1.1)
**Domain:** Nutritional data layer for an existing family meal planner
**Researched:** 2026-03-15
**Confidence:** MEDIUM

## Executive Summary

This milestone adds structured ingredient tracking and nutritional calculation to an existing Next.js meal planner. The app already works — recipes are saved, meal plans are built, and the family uses it. The goal is to retrofit a nutritional data layer on top without disrupting existing functionality. The correct approach is additive: introduce a new `Ingredient` table and `RecipeIngredient` join table alongside the existing freetext `Recipe.ingredients` field, not instead of it. Everything else — nutrition display, history views, autocomplete — follows naturally from that schema foundation.

The biggest implementation risk is not technical complexity but data quality. The USDA FoodData Central dataset is US-English; the family cooks German food. Fuzzy matching English ingredient names against German text will produce a near-zero hit rate without an explicit German name alias strategy. Similarly, the existing `MealPlan` schema has a unique constraint of one entry per user per day — the app's two-meals-per-day design means this constraint must be resolved before nutrition history can be built, or history totals will silently miss half of every day's meals. These two schema concerns must be addressed in Phase 1 before any UI work begins.

The technology additions are minimal and conservative: one npm package (`recharts` for charts), one PostgreSQL extension (`pg_trgm` for fuzzy search), and a one-time USDA seed script. All new logic follows existing codebase patterns exactly: Server Components call Prisma directly, Client Components call API routes, AI calls use the existing provider setup. The nutrition calculation itself is pure arithmetic — no library needed. A family app at this scale will never stress these choices.

## Key Findings

### Recommended Stack

The existing stack (Next.js, React 19, Tailwind CSS 4, PostgreSQL, Prisma 7, NextAuth 5, OpenAI SDK) requires only two additions: `recharts ^2.15` for nutrition history charts, and the `pg_trgm` PostgreSQL extension (a built-in extension, not an npm package) for server-side fuzzy ingredient search. No other new dependencies are warranted. Notably, Fuse.js and similar client-side fuzzy libraries should be skipped in favor of `pg_trgm`, which runs server-side and handles the full ingredient DB without shipping data to the client.

**Core new technologies:**
- `pg_trgm` (PostgreSQL built-in): fuzzy ingredient name matching — no client library, production-grade, handles German umlauts via UTF-8
- `recharts ^2.15`: nutrition history bar charts — most widely used React chart library, composable API, TypeScript types bundled
- `src/lib/nutrition.ts` (hand-rolled): per-portion calculation utility — pure arithmetic, no library warranted
- `src/lib/units.ts` (hand-rolled): unit conversion table for g, ml, EL, TL, Tasse, Prise — 6 units do not justify a package
- USDA FoodData Central bulk download: one-time seed, no runtime API dependency, avoids rate limits

### Expected Features

**Must have (table stakes):**
- Nutrient display (kcal + protein, fat, carbs) per serving on recipe detail page
- Ingredient autocomplete against local DB when editing recipes
- DB-backed structured ingredients with amount + unit per recipe
- Daily nutrition view ("Meine Nährwerte")
- Weekly nutrition overview with historical navigation

**Should have (differentiators for this app):**
- AI-estimated nutrition for ingredients with no DB match — prevents the "unknown ingredient = no data" dead end
- Auto-matching on URL import and AI-save flows — zero extra work for users on new recipes
- Ingredient management UI (Zutatenverwaltung) — critical for a German family, since USDA names are English
- USDA seed data as baseline — so the DB is immediately useful without manual entry

**Defer to v2+:**
- Calorie goals / dietary targets per user — requires goal-setting UI and progress tracking; build after users have history
- Micronutrient tracking (vitamins, minerals) — explicitly deferred in spec as "Variante C"; DB schema change required
- Grocery list quantity rollup — separate milestone (Milestone 2); keep structured ingredients clean so M2 can consume them

### Architecture Approach

The architecture is purely additive. Two new Prisma models (`Ingredient`, `RecipeIngredient`) plug into the existing schema. Three new API route groups (`/api/ingredients`, `/api/recipes/[id]/ingredients`, `/api/nutrition/history`) and one new AI estimation route (`/api/ai/estimate-nutrition`) follow the exact pattern of existing routes. Two new pages (`/naehrstoffe`, `/zutaten`) follow the existing `(app)` route group pattern. Three existing files require modification: `RecipeForm`, the recipe detail page, and `NavBar` (5th tab). The `Recipe.ingredients` freetext field is preserved as fallback — structured data coexists with it, not replaces it.

**Major components:**
1. `Ingredient` table + USDA seed script — nutritional database foundation; everything else depends on it
2. `RecipeIngredient` join table — links recipes to structured ingredients with amount, unit, and optional AI-estimated nutrients
3. `src/lib/nutrition.ts` — single pure function used by both recipe detail and history API; prevents calculation drift
4. `src/lib/ingredient-matching.ts` — server-side fuzzy matching with confidence threshold; callers decide what to do with null
5. `IngredientEditor` client component — autocomplete-driven structured ingredient editing within `RecipeForm`
6. `NaehrstoffeView` client component + `/api/nutrition/history` — day/week toggle history with Recharts bar chart

### Critical Pitfalls

1. **MealPlan unique constraint blocks 2-meals-per-day nutrition history** — The current `@@unique([date, forUserId])` only allows one meal per user per day. Resolve this at schema level in Phase 1 (add `mealType: LUNCH | DINNER` discriminator) before any history feature is built; fixing a populated table later is painful.

2. **Non-gram units silently produce wrong nutrition totals** — `amount=1, unit="Stück"` multiplied by `nutrientPer100g / 100` returns a meaningless number. Define calculable units at schema level (`GRAM | ML | PIECE | OTHER`); only calculate from DB when unit maps to grams; use AI estimation for all other units; display a `~` prefix when any ingredient uses estimated values.

3. **USDA English names produce near-zero German match rate** — Auto-matching "Hähnchenbrust" against "Chicken Breast, raw" fails without German name aliases. Add a `nameAliases String[]` field to `Ingredient` (or a separate alias table) and seed German translations during import. Alternatively, evaluate using the BLS (Bundeslebensmittelschlüssel) as primary source.

4. **Fuzzy matching auto-linking wrong ingredient silently** — "Sahne" matching "Saure Sahne" instead of "Schlagsahne" is a 3.6x fat difference. Never auto-link below similarity score 0.9; store `ingredientId = null` and fall back to AI estimation for ambiguous matches; always show the matched ingredient name in the recipe edit UI with a "change" option.

5. **USDA dataset noise from full import** — Importing all 400,000+ USDA entries (especially Branded Foods) buries useful matches in noise. Import SR Legacy only (~9,000 entries), filtered to whole food categories. Keep `COUNT(*) FROM ingredients` under 10,000 for this use case.

## Implications for Roadmap

Based on research, the dependency chain is clear and dictates phase order. Nothing visible can be built until the schema and data are in place. The schema itself has a pre-existing bug (MealPlan constraint) that must be fixed before proceeding.

### Phase 1: Schema, Data Audit, and Seed

**Rationale:** Every other feature depends on `Ingredient` and `RecipeIngredient` existing. Two schema concerns must be resolved here before any code is written: the MealPlan unique constraint and the German name alias strategy for USDA data. Wrong choices here require a full re-seed and migration later.

**Delivers:** Populated `Ingredient` table with German name aliases; `RecipeIngredient` migration; MealPlan schema supporting 2 meals/day; `pg_trgm` extension enabled via migration.

**Addresses:** Ingredient DB (table stakes); USDA seed data (differentiator).

**Avoids:** Pitfall 1 (MealPlan constraint), Pitfall 2 (unit calculation), Pitfall 3 (German name gap), Pitfall 5 (USDA noise), Pitfall 8 (USDA per-100g normalization).

**Research flag:** Needs deeper research — USDA SR Legacy dataset structure, German alias strategy options (BLS vs. manual aliases vs. Claude translation at import time), and MealPlan migration approach.

### Phase 2: Ingredient Admin UI (Zutatenverwaltung)

**Rationale:** Enables the family to verify and correct seed data before it powers recipe nutrition. Also establishes the full CRUD pattern (`/api/ingredients` routes, `IngredientForm` component) that Phase 3 builds on. Unblocks manual ingredient management independent of recipe flows.

**Delivers:** `/zutaten` page with list, search, create, edit, delete; `IngredientForm` client component; `GET/POST/PUT/DELETE /api/ingredients` routes; 5th nav tab placeholder.

**Addresses:** Ingredient management UI (differentiator); ingredient visibility rules (Pitfall 7 — shared DB, not per-user).

**Avoids:** Pitfall 11 (ingredient deletion orphaning RecipeIngredient rows — implement `SET NULL` + copy to estimated fields at delete time).

**Research flag:** Standard CRUD patterns match existing codebase — skip deep research.

### Phase 3: IngredientEditor in RecipeForm + Nutrition Display

**Rationale:** This is the first user-visible payoff. Adds structured ingredient entry to recipe editing and immediately shows nutrition on the recipe detail page. Introduces the core `calculateNutritionPerPortion` utility that all downstream features reuse.

**Delivers:** `IngredientEditor` client component with autocomplete; `GET/POST /api/recipes/[id]/ingredients`; `src/lib/nutrition.ts` utility; `NutritionTable` server component; nutrition shown on recipe detail page; existing freetext display preserved as fallback.

**Addresses:** Ingredient autocomplete (table stakes); per-recipe nutrition display (table stakes); DB-backed structured ingredients (table stakes).

**Avoids:** Pitfall 4 (freetext migration — conditional render: structured if available, else freetext); Pitfall 9 (`servings` default — show servings inline with per-portion value, make editable on detail page).

**Research flag:** Standard patterns — skip deep research. Autocomplete debounce and `pg_trgm` query threshold tuning may need iteration.

### Phase 4: AI Integration (Matching + Estimation)

**Rationale:** Automation that makes the feature scale. Without this, existing recipes only gain nutrition when manually re-edited. URL import and AI save flows gain structured ingredients automatically. AI estimation fills the gap for unmatched ingredients.

**Delivers:** `src/lib/ingredient-matching.ts`; `POST /api/ai/estimate-nutrition`; URL import route extended to create `RecipeIngredient` rows post-creation; AI save route extended similarly; batched AI estimation (1 call per recipe, not N calls).

**Addresses:** Auto-matching on URL import and AI save (differentiator); AI-estimated nutrition for unmatched ingredients (differentiator).

**Avoids:** Pitfall 3 (wrong ingredient match — confidence threshold, UI review affordance); Pitfall 6 (N API calls per recipe — batch into single call per recipe, async fill-in pattern).

**Research flag:** Needs targeted research on prompt structure for batched structured nutrient output and confidence thresholds for `pg_trgm` similarity scores.

### Phase 5: Nutrition History ("Meine Nährwerte")

**Rationale:** Completes the milestone. Depends on sufficient recipes having structured ingredients (from Phases 3–4) to be useful. History is only meaningful once the family has been using structured ingredients for some time.

**Delivers:** `GET /api/nutrition/history`; `NaehrstoffeView` client component with day/week toggle and Recharts bar chart; `/naehrstoffe` page; NavBar 5th tab wired to this route; composite index on `meal_plans(for_user_id, date)`.

**Addresses:** Daily + weekly nutrition view (table stakes); historical navigation (table stakes).

**Avoids:** Pitfall 5 (MealPlan schema — already fixed in Phase 1); "no data" vs "zero kcal" distinction; `customMeal` entries shown but excluded from totals with "Kalorien unbekannt" label; Pitfall 12 (history query performance — index added at migration time, history limited to past 12 weeks with pagination).

**Research flag:** Recharts API is well-documented — skip deep research. History query join depth (MealPlan → Recipe → RecipeIngredient → Ingredient) should be validated against real data volume.

### Phase Ordering Rationale

- Phase 1 must come first: `Ingredient` and `RecipeIngredient` tables are the foundation. The MealPlan schema bug blocks Phase 5 — fixing it in Phase 1 avoids a migration on a populated table later.
- Phase 2 (Admin UI) before Phase 3 (RecipeForm integration) because the ingredient CRUD API routes established in Phase 2 are consumed by Phase 3's autocomplete.
- Phase 3 delivers the first user-visible nutrition feature and proves the calculation utility works before it is consumed by Phase 5.
- Phase 4 can overlap with Phase 3 but is sequenced after because it modifies import routes that Phase 3 leaves untouched.
- Phase 5 last because it has the deepest data dependency — it is only useful once a backlog of structured-ingredient recipes exists.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** USDA SR Legacy dataset structure and field mapping; German alias strategy (BLS vs. manual vs. AI translation); MealPlan unique constraint migration approach with existing data.
- **Phase 4:** Prompt structure for batched AI nutrition estimation returning structured JSON arrays; `pg_trgm` similarity score threshold calibration for German ingredient names.

Phases with standard patterns (can skip research-phase):
- **Phase 2:** Standard CRUD — mirrors existing `/api/recipes` pattern exactly.
- **Phase 3:** Well-established debounced autocomplete + server component conditional rendering.
- **Phase 5:** Recharts is well-documented; history query pattern is a standard date-range join.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only two additions (recharts, pg_trgm); both well-established; pg_trgm is a PostgreSQL built-in. Only uncertainty is recharts exact version — verify with `npm info recharts version`. |
| Features | MEDIUM | Feature set is well-defined by spec. The MealPlan constraint issue introduces scope uncertainty in Phase 1. WebSearch unavailable for current-year verification. |
| Architecture | HIGH | Based on direct codebase inspection; patterns are consistent across all examined files; additive approach minimizes breakage risk. |
| Pitfalls | MEDIUM | Critical pitfalls identified from both codebase inspection and domain knowledge. USDA dataset counts and German coverage quality need validation after seeding. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **USDA German coverage**: Foundation Foods covers ~1,200 mostly US foods. SR Legacy (~9,000) may have better coverage, but German staples (Quark, Leberkäse, Schwarzbrot) will still be missing. Decide in Phase 1 whether to add German aliases to USDA entries, supplement with a hand-curated German list, or use the BLS as primary source. Validate after initial seed.

- **MealPlan unique constraint**: The current `@@unique([date, forUserId])` only allows one meal per user per day. Before Phase 1 schema work begins, inspect the actual Prisma schema and existing MealPlan data to determine the safest migration approach (add `mealType` discriminator vs. change constraint structure).

- **Recharts exact version**: Pin to `^2.15` as a conservative estimate; run `npm info recharts version` to confirm the latest stable version before installing.

- **"Stück" unit ambiguity**: Per-piece nutrition calculation requires density/weight per ingredient (e.g., "1 Ei" = 60g). Document this as a known limitation in the UI; AI estimation is the fallback. Decide whether to add an optional `gramsPerPiece` field to `Ingredient` for common piece-unit foods.

- **Retroactive enrichment**: Existing recipes have freetext ingredients only. The history view will be empty until recipes are migrated. Consider whether to provide a batch AI-parsing flow in Phase 4 to convert freetext ingredients to structured rows — not in spec, but affects history usefulness.

## Sources

### Primary (HIGH confidence)
- `/prisma/schema.prisma` — existing data model, direct inspection
- `docs/superpowers/specs/2026-03-15-naehrstoffe-design.md` — authoritative feature spec, direct inspection
- `.planning/PROJECT.md` — project context and milestone scope, direct inspection
- `src/app/api/**`, `src/app/(app)/**`, `src/components/**` — existing codebase patterns, direct inspection
- PostgreSQL pg_trgm documentation — built-in extension, well-established

### Secondary (MEDIUM confidence)
- USDA FoodData Central documentation — dataset structure and download format (training data, Aug 2025)
- Recharts v2.x API — well-established as of Aug 2025; version needs live verification
- Domain patterns from MyFitnessPal, Cronometer, Yummly — established nutrition app patterns

### Tertiary (LOW confidence)
- USDA German food coverage — assumed to be limited for German staples; needs validation after seeding
- BLS (Bundeslebensmittelschlüssel) as USDA alternative — mentioned as option but not evaluated in depth

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*
