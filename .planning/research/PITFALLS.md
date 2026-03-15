# Domain Pitfalls: Structured Ingredients & Nutritional Tracking

**Domain:** Adding nutritional data features to an existing meal planner
**Researched:** 2026-03-15
**Confidence:** MEDIUM — based on established patterns in this domain; web verification unavailable in this environment

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or features that quietly produce wrong numbers.

---

### Pitfall 1: Non-Convertible Units Silently Producing Zero Nutrition

**What goes wrong:** Ingredients entered with volume or piece-based units (e.g., "1 Stück Ei", "200 ml Milch", "1 EL Olivenöl") cannot be converted to grams without density/mass lookup tables. If the system stores `amount=1, unit="Stück"` and then multiplies `1 * nutrientPer100g / 100`, the result is nonsensical or treated as zero.

**Why it happens:** The data model stores raw `amount` and `unit` as free strings. The spec lists "g, ml, Stück, etc." as valid units but does not define a conversion layer. Without a unit-conversion table, the calculation `amount * nutrient / 100` is only correct when `unit == "g"`. For all other units it silently returns a wrong number.

**Consequences:** Recipe nutrition totals are wildly off. Users lose trust in the feature. Bugs are invisible — no error thrown, just wrong data displayed.

**Prevention:**
- Define which units are "calculable" vs "unmappable" at schema level.
- For the initial scope, support only `g` and `ml` (with a density value on Ingredient) for exact calculation; treat piece/spoon/cup units as "estimated" and force AI estimation instead of DB lookup.
- Store a `unitType` enum on RecipeIngredient: `GRAM | ML | PIECE | OTHER`. Only calculate from DB when `unitType == GRAM`.
- Display a visual indicator ("~" prefix) when any ingredient uses estimated values so users know the total is approximate.

**Detection:** Run a query after seed import: `SELECT DISTINCT unit FROM recipe_ingredients`. Any value that is not `g` or `ml` is a conversion risk.

**Phase:** Address in Phase 1 (schema design) before any UI is built.

---

### Pitfall 2: USDA Data Volume and Noise Overwhelming the Matching System

**What goes wrong:** USDA FoodData Central contains ~400,000+ entries across multiple datasets (SR Legacy, Foundation, Branded, Survey/FNDDS). The Branded Foods dataset alone has hundreds of thousands of US-market branded products irrelevant to a German family cooking app. Importing the full dataset produces a matching system that suggests "KRAFT SINGLES AMERICAN CHEESE PRODUCT" when the user types "Käse".

**Why it happens:** Developers download the bulk export and import everything without filtering by dataset type or language relevance. The result is a huge table with low-relevance matches that win on string similarity despite being wrong.

**Consequences:** Autocomplete is noisy and untrustworthy. AI matching picks wrong items. Ingredient DB grows to hundreds of MB, slowing all queries. Users manually override everything, defeating the automation goal.

**Prevention:**
- Import only from SR Legacy (the curated, non-branded dataset, ~9,000 entries) as the initial seed. This is the "food scientist" dataset, not the branded product catalog.
- Filter to the ~200-400 most common ingredients for German home cooking manually, or use the USDA category codes to restrict to whole food categories (Dairy, Vegetables, Meats, etc.).
- Supplement with a small hand-curated German-foods list (Quark, Magerquark, Leberwurst) that USDA SR Legacy does not cover well.
- The spec's goal of "initial befüllt aus USDA" is achievable, but scoped import is essential.

**Detection:** After import, count entries. If `SELECT COUNT(*) FROM ingredients` > 10,000, the import is too broad for this use case.

**Phase:** Phase 1 (data import script). Wrong choices here require a full re-seed later.

---

### Pitfall 3: Fuzzy Matching Returning Plausible-but-Wrong Ingredients

**What goes wrong:** A fuzzy name match on "Hackfleisch" might return "Hackfleisch gemischt (Rind/Schwein)" with 18g protein per 100g, when the recipe actually uses lean beef mince at 21g protein. Or "Sahne" matches "Saure Sahne" (sour cream, 10% fat) instead of "Schlagsahne" (whipping cream, 36% fat) — a 3.6x difference in fat content.

**Why it happens:** String similarity (Levenshtein, trigram, etc.) is blind to semantic meaning. Short ingredient names with many variants ("Sahne", "Öl", "Mehl") have high ambiguity. The system picks the top match and treats it as correct with no human review step.

**Consequences:** Nutrition totals are systematically wrong in hard-to-detect ways. The family plans meals thinking they hit a protein target when they have not.

**Prevention:**
- Never auto-link an ingredient without a confidence threshold. Only auto-link when similarity score > 0.9 AND only one candidate exists above 0.7.
- For ambiguous matches, store `ingredientId = null` and fall back to AI estimation rather than forcing a low-confidence DB match.
- On the recipe ingredient edit UI, always show which DB ingredient is matched and provide a "change" button. This makes wrong matches visible and fixable.
- Consider using PostgreSQL `pg_trgm` (trigram) index for similarity search — it is built-in and avoids a separate search service.

**Detection:** Manually review 20 matched recipes after the first import. Check that "Sahne" → "Schlagsahne" and "Hackfleisch" → correct fat percentage variant.

**Phase:** Phase 2 (matching logic). The UI review affordance must be in Phase 3.

---

### Pitfall 4: Migration of Existing Freetext Ingredients Breaks Recipe Display

**What goes wrong:** The existing `Recipe.ingredients` field is a freetext comma-separated string (e.g., "300g Hackfleisch, 1 Zwiebel, 200ml Tomatensoße"). When the new `RecipeIngredient` table is introduced, there will be a transition period where some recipes have `RecipeIngredient` rows and others still only have the freetext string. UI components that switch to rendering `RecipeIngredient` rows will show an empty ingredient list for old recipes.

**Why it happens:** The spec correctly notes that `Recipe.ingredients` "bleibt als Fallback/Anzeige erhalten" — but without an explicit conditional render strategy, the UI will likely be written to show one or the other, not both.

**Consequences:** All existing recipes appear to have no ingredients until manually re-entered. Users lose confidence in data integrity.

**Prevention:**
- The ingredient display component must have a clear priority rule: `if recipeIngredients.length > 0, render structured; else render freetext string`.
- Never remove the freetext field from the schema or UI until all recipes have been migrated.
- Add a visual badge ("Nährwerte verfügbar" vs no badge) so users understand which recipes have been upgraded vs not yet.
- The migration path for existing recipes is: URL re-import, AI parsing, or manual entry — not automatic. Do not attempt a bulk auto-migration of freetext strings to structured ingredients, as accuracy will be low.

**Detection:** After deploying the new schema, query `SELECT COUNT(*) FROM recipes WHERE id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients)`. These recipes are "legacy" and must gracefully fall back to freetext.

**Phase:** Phase 2 (schema migration) and Phase 3 (UI conditional rendering).

---

### Pitfall 5: Nutrition History Based on MealPlan Entries Is Misleading Without Explicit Scope

**What goes wrong:** The "Meine Nährwerte" history screen shows nutrition per day based on `MealPlan` entries. However: (a) `MealPlan` currently has a unique constraint of one entry per `date_forUserId` — only one meal per user per day — but the app has 2 meals per day (Mittagessen + Abendessen); (b) `customMeal` entries (free text meals without a recipe) have no nutrition data at all; (c) days with no plan entry appear as zero-calorie days, not as "no data" days.

**Why it happens:** The `MealPlan` schema was designed for the planner feature, not nutrition tracking. The unique constraint `@@unique([date, forUserId])` only allows one meal per user per day, which conflicts with the 2-meals-per-day app design described in PROJECT.md.

**Consequences:** The history screen shows wrong totals (missing one meal per day), shows zero for unplanned days as if the user ate nothing, and silently ignores free-text meals. Users see "1,200 kcal" when reality is much higher.

**Prevention:**
- Verify the MealPlan schema actually supports 2 meals per day (e.g., a `mealType: LUNCH | DINNER` field). The current unique constraint `@@unique([date, forUserId])` only permits one meal per user per day — this needs to be fixed at schema level before history is built.
- Distinguish "no data" (no plan entry) from "zero calories" (plan entry with no nutrition) in the history UI. Show a dash or "—" for days with no entry rather than "0 kcal".
- For `customMeal` entries, show them in the history timeline but with "Kalorien unbekannt" rather than contributing zero to totals.

**Detection:** Check if the unique constraint allows two meals per day before building history UI. `SHOW INDEX FROM meal_plans` or inspect Prisma schema for `@@unique`.

**Phase:** Phase 1 (schema audit before any new features). Fixing this constraint later requires a migration on an already-populated table.

---

## Moderate Pitfalls

---

### Pitfall 6: AI Nutrition Estimation Called Per-Ingredient on Every Save

**What goes wrong:** Every time a recipe with unmatched ingredients is saved (import, AI save, manual entry), the system calls the Claude API once per unmatched ingredient. A recipe with 10 unmatched ingredients fires 10 API calls. With 50 recipes imported in an evening, that is 500 API calls.

**Why it happens:** The natural implementation is a loop: `for each ingredient with no match, call AI, store estimated values`. There is no batching.

**Prevention:**
- Batch all unmatched ingredients from a single recipe into one API call: "Estimate nutrition per 100g for these ingredients: [list]". Return a JSON array. This reduces N calls to 1 call per recipe.
- Cache AI estimations: if an ingredient name has already been estimated (even without a DB match), reuse the stored `estimated*` values rather than re-calling the API.
- AI estimation should be async and non-blocking for the save operation. Save the `RecipeIngredient` rows immediately with `estimated* = null`; fill in estimated values in a background step.

**Phase:** Phase 2 (AI integration design).

---

### Pitfall 7: Ingredient DB Is Global but Recipes Are User-Scoped

**What goes wrong:** The `Ingredient` table has a `createdBy` field, implying ingredients belong to users. But the nutritional database is meant to be shared — if User A adds "Dinkelmehl" with nutrition values, User B should benefit from it when matching their recipe. If ingredients are treated as per-user private data, every user re-enters the same items.

**Why it happens:** The `createdBy` FK creates an implicit ownership assumption. The matching logic may add `WHERE createdBy = session.user.id` to ingredient searches, breaking cross-user sharing.

**Prevention:**
- Clearly decide ownership semantics in the schema: system/seed ingredients have no `createdBy` (or a special sentinel), user-added ingredients are visible to all users in the family (same app instance).
- Since this is a single-family app, treat all ingredients as shared. The `createdBy` field is useful for attribution (who added this custom entry) but should not restrict visibility.
- Ingredient search/autocomplete queries must NOT filter by `createdBy`.

**Phase:** Phase 1 (schema design) — add a comment or `isSystem: Boolean` flag to the Ingredient model to make intent explicit.

---

### Pitfall 8: USDA Nutritional Values Are Per 100g But USDA Portions Differ

**What goes wrong:** The design correctly normalizes to per-100g values. However, when pulling data from USDA FoodData Central, the raw API returns values per the USDA's "serving size" (e.g., "1 cup, 245g" for milk). Developers copy the absolute values without normalizing to 100g. The stored `caloriesPer100g` then contains the value for 245g.

**Why it happens:** The USDA API's `foodNutrients` array has `value` in the unit specified by `unitName`. The relationship to per-100g requires `value / portionAmount * 100`. This calculation is easy to miss or apply inconsistently.

**Prevention:**
- Write the USDA import script to always normalize: `storedValue = rawValue / portionGrams * 100`.
- For SR Legacy, USDA already provides values per 100g by default (the baseline portion is 100g for most entries). Verify this assumption per food category before importing.
- After importing, spot-check: chicken breast should be ~165 kcal/100g. If any entry shows >500 kcal/100g for a non-fat food, the normalization failed.

**Phase:** Phase 1 (data import script). Include a validation assertion in the seed script.

---

### Pitfall 9: `servings` Defaulting to 4 Causes Wrong Per-Portion Calculations

**What goes wrong:** The existing import-url route defaults `servings: 4` when none is detected. Nutrition per portion = total / servings. A recipe for 2 people with `servings=4` shows half the actual calories per portion. The spec calculates "Nährwerte pro Portion = Summe aller RecipeIngredients / recipe.servings" — this is correct in logic but depends entirely on `servings` being accurate.

**Why it happens:** The default was reasonable when `servings` was just a display hint. It becomes load-bearing once nutrition is derived from it.

**Prevention:**
- The recipe nutrition display must always show `servings` prominently next to the per-portion value: "Pro Portion (4 Portionen): 650 kcal". This lets users immediately see and fix wrong portion counts.
- Make `servings` editable directly on the recipe detail page (not only in the edit form), since adjusting it updates all nutrition calculations instantly.
- AI prompts for ingredient extraction should explicitly require servings extraction and return null (not default 4) if unknown — then the UI shows an explicit "Portionen angeben" prompt.

**Phase:** Phase 3 (nutrition display UI). Also review the import prompt in Phase 2.

---

## Minor Pitfalls

---

### Pitfall 10: German Ingredient Names vs USDA English Names

**What goes wrong:** The USDA database is in English. Fuzzy matching "Hackfleisch" against "Ground beef, 80% lean" requires either translation or a separate German name mapping. Without it, matching accuracy for the core German ingredient vocabulary is near zero.

**Prevention:**
- Either import a German food database (e.g., the BLS — Bundeslebensmittelschlüssel) alongside or instead of USDA, or maintain a German-to-USDA mapping table for the ~200 most common German cooking ingredients.
- Since the spec says "initial befüllt aus USDA", add German `name` aliases to the Ingredient table (or a separate `IngredientAlias` table) during seed import. Matching runs on aliases, display uses the German name.
- Alternative: use Claude to translate ingredient names during the import script, not at match time.

**Confidence:** HIGH — this is a structural requirement given the German-language app context.

**Phase:** Phase 1 (seed import design).

---

### Pitfall 11: Deleting an Ingredient from the DB Orphans RecipeIngredient Rows

**What goes wrong:** The Zutatenverwaltung allows deleting ingredients. If a user deletes "Hackfleisch" from the DB, all RecipeIngredient rows with `ingredientId = hackfleisch_id` lose their reference. With a FK constraint and `onDelete: RESTRICT`, the delete will fail with an error. With `onDelete: SET NULL`, the rows silently drop to estimated-only mode with no recalculation.

**Prevention:**
- Use `onDelete: SET NULL` for `RecipeIngredient.ingredientId` so deletes do not cascade-destroy recipe data.
- When an ingredient is deleted, null out `ingredientId` but copy the last-known nutrient values into the `estimated*` fields before nulling, so the recipe does not lose its nutrition data entirely.
- Warn in the Zutatenverwaltung UI: "Diese Zutat wird in X Rezepten verwendet. Löschen entfernt die Nährwertverknüpfung."

**Phase:** Phase 2 (schema) and Phase 4 (Zutatenverwaltung UI).

---

### Pitfall 12: History View Performance on Wide Date Ranges

**What goes wrong:** The "Alle vergangenen Wochen einsehbar" history requires joining MealPlan → Recipe → RecipeIngredient → Ingredient for every planned meal across potentially years of data. Without proper indexing, this query will be slow as history grows.

**Prevention:**
- Index `meal_plans.date` and `meal_plans.for_user_id` — these are the primary filter axes for history queries.
- Index `recipe_ingredients.recipe_id` for the join.
- For the first version, limit history to the past 12 weeks. Add "load more" pagination rather than querying unbounded history.
- This is a family app with 4 users and ~2 meals/day — the dataset stays small for years. This is low urgency but worth keeping in mind.

**Phase:** Phase 3 (history query design). Index additions can be done at any time via migration.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Schema design | MealPlan unique constraint breaks 2-meals-per-day | Audit and fix before writing any new tables |
| USDA seed import | Full dataset import produces noise; EN names don't match DE | Import SR Legacy only, add DE name aliases |
| USDA seed import | Values not normalized to per-100g | Validate with known-value spot checks in seed script |
| Fuzzy matching logic | Wrong ingredient matched silently | Confidence threshold; UI review affordance |
| Unit handling | Non-gram units produce wrong calorie math | Define calculable units explicitly; use AI estimation for others |
| AI estimation | N API calls per recipe | Batch per recipe; async fill-in pattern |
| Recipe detail UI | `servings` default of 4 makes calories wrong | Show servings inline with per-portion value; make editable |
| Legacy recipe migration | Old freetext recipes show empty ingredient list | Conditional render: structured if available, else freetext |
| Ingredient deletion | Orphans RecipeIngredient with wrong nutrition | SET NULL + copy last-known values to estimated fields |
| Nutrition history | customMeal entries and zero-entry days show 0 kcal | Distinguish "no data" from "zero"; skip customMeal in totals |

---

## Sources

- Project schema: `/Users/markuszabel/Development/meal-planner/prisma/schema.prisma` (direct inspection)
- Feature spec: `/Users/markuszabel/Development/meal-planner/docs/superpowers/specs/2026-03-15-naehrstoffe-design.md` (direct inspection)
- Existing import route: `/Users/markuszabel/Development/meal-planner/src/app/api/recipes/import-url/route.ts` (direct inspection)
- USDA FoodData Central dataset structure: training knowledge (MEDIUM confidence — dataset composition verified against known published structure, but exact current entry counts may differ)
- Unit conversion and fuzzy matching patterns: training knowledge from nutrition app domain (MEDIUM confidence)
- PostgreSQL pg_trgm for similarity search: built-in PostgreSQL extension, HIGH confidence
