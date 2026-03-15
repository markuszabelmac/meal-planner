# Feature Landscape

**Domain:** Nutritional data for family meal planner (structured ingredients, nutrient calculation, personal history)
**Researched:** 2026-03-15
**Confidence:** MEDIUM — based on training knowledge of the domain (nutritional DB patterns are well-established); WebSearch unavailable for current-year verification

---

## Table Stakes

Features users expect in this domain. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Nutrient display per serving on recipe detail page | Any nutrition-aware app shows this prominently | Low | Spec places it under ingredients; servings already exist on Recipe model |
| Ingredient autocomplete against local DB | Manual entry without autocomplete is friction users won't tolerate | Medium | Fuzzy match; debounce required; must handle no-match gracefully |
| Calorie + macros (protein, fat, carbs) display | Minimum viable nutritional info; users track these four primarily | Low | Spec includes 7 nutrients — all expected once any nutrition is shown |
| DB-backed ingredient with amount + unit | Foundation for all calculations; free-text ingredients alone cannot power nutrition | Medium | Unit normalization (g, ml, Stück) is the hard part |
| Personal daily nutrition view | If nutrition is tracked, users expect to see their day's total | Medium | Depends on MealPlan entries; only works for planned meals |
| Weekly nutrition overview | Users plan by week; daily view alone is insufficient for patterns | Medium | Same data source as daily, different aggregation |
| Historical navigation (past weeks) | Without history, the feature is purely forward-looking and loses value quickly | Low | Reuses week-planner navigation pattern |

## Differentiators

Features that set this implementation apart. Not universally expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-estimated nutrition for unmatched ingredients | Eliminates the "unknown ingredient = no nutrition" dead end; graceful degradation | Medium | Uses existing Claude API integration; prompt engineering needed |
| Auto-matching on URL import and AI inspiration save | Zero extra work for user when importing recipes — structured ingredients appear automatically | High | Requires reliable name normalization; partial matches must be reviewed or accepted silently |
| Ingredient management UI (add/edit/delete per-100g) | Users can extend the DB with local/regional foods not in USDA seed data | Medium | Critical for a German-speaking family; USDA names may not match local product names |
| USDA FoodData Central seed data | Provides an immediately useful baseline DB without manual data entry | Medium | One-time import script; USDA names are English, need German-name aliases or accept mismatch |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Calorie goal / diet targets per user | Requires dietary profile management, goal-setting UI, and progress tracking — scope doubles | Note as future extension; UserPreference model can store goals later |
| Micronutrient tracking (vitamins, minerals) | Massively increases DB size requirements; USDA data coverage is inconsistent; UI becomes complex | Spec calls these "Variante C" — defer explicitly |
| Grocery list quantity rollup from ingredients | Separate milestone (Milestone 2 in PROJECT.md); entangles unit normalization complexity here | Implement structured ingredients cleanly so M2 can consume them |
| Barcode / product scanning | Requires external product DB (Open Food Facts or similar), mobile camera integration; outside project scope | Not applicable for a recipe-centric family planner |
| Per-user ingredient DB (separate DBs per family member) | Family shares recipes; shared ingredient DB is correct; per-user splits are unnecessary complexity | Single shared Ingredient table with createdBy tracking is sufficient |
| Real-time sync / live nutrition updates across devices | Online-only app already; no offline case to handle; just server-fetch on load | Standard Next.js server component refetch on navigation |
| Nutrition label formatting (FDA/EU style) | Visual styling complexity for marginal benefit in a family app | Simple table layout is sufficient |

## Feature Dependencies

```
Ingredient DB (seed from USDA)
  → RecipeIngredient table (structured rows per recipe)
      → Autocomplete on manual ingredient entry  (depends on Ingredient DB)
      → Auto-match on URL import                (depends on Ingredient DB + existing URL import)
      → Auto-match on AI inspiration save       (depends on Ingredient DB + existing AI flow)
      → AI nutrition estimation (fallback)      (depends on RecipeIngredient model + Claude API)
      → Per-recipe nutrition display            (depends on RecipeIngredient rows existing)
          → "Meine Nährwerte" daily view        (depends on MealPlan + per-recipe nutrition)
              → "Meine Nährwerte" weekly view   (depends on daily view logic)
                  → Historical navigation       (depends on weekly view + MealPlan history)

Ingredient management UI                        (depends on Ingredient DB, independent of recipe flow)
```

## MVP Recommendation

Build in this order to unlock user value at each step:

1. **Ingredient DB + seed data** — Nothing else works without it; USDA CSV import script, German-language naming will need attention
2. **RecipeIngredient model + migration** — Schema foundation; keep existing `ingredients` text field as fallback per spec
3. **Manual ingredient entry with autocomplete** — Core user interaction; proves the DB works before automation
4. **Per-recipe nutrition display** — First visible payoff; motivates continued use
5. **Auto-matching in URL import and AI save** — Automation that makes the feature scale; users won't manually re-enter ingredients for existing recipes
6. **AI nutrition estimation for unmatched ingredients** — Fills gaps; makes nutrition completeness much higher
7. **"Meine Nährwerte" daily + weekly view** — Requires sufficient recipes with structured ingredients to be useful; builds on everything above
8. **Historical navigation** — Low effort add-on to weekly view; high value over time
9. **Ingredient management UI** — Needed for maintenance; less urgent than display features

**Defer:**
- Calorie goals / dietary targets: Requires a UserPreference-based goal system; build after users have history to make goals meaningful
- Micronutrients (Variante C): Explicitly deferred in spec; DB schema change required

## Complexity Notes

| Area | Complexity Driver | Why |
|------|-------------------|-----|
| USDA seed data import | Medium | USDA FoodData Central exports are large (SR Legacy: ~8,800 foods; Foundation: ~3,000); need filtering, name normalization, and German alias strategy |
| Unit normalization | High | "1 Dose", "200g", "2 EL" (tablespoons) — converting to grams for per-100g calculation requires a unit conversion table and German unit abbreviation mapping |
| Fuzzy ingredient matching | Medium | Levenshtein distance or trigram similarity via PostgreSQL `pg_trgm` extension works well; threshold tuning affects false-positive rate |
| AI estimation prompt reliability | Medium | Claude can estimate macros for common foods reliably but structured JSON output requires careful prompting and validation |
| MealPlan unique constraint | Low-blocker | Current schema: `@@unique([date, forUserId])` — only one meal per user per day. Spec references Mittagessen + Abendessen (2 meals/day). Nutrition history depends on this; needs resolution before building nutrition history view |

## Dependencies on Existing Features

| Existing Feature | How It's Used | What Must Not Break |
|-----------------|---------------|---------------------|
| Recipe model (`ingredients` text field) | Stays as display fallback when no RecipeIngredient rows exist | Existing recipe display must continue working |
| Recipe `servings` field | Divides total RecipeIngredient nutrition by servings for per-portion display | Must be populated; recipes without servings show no per-portion nutrition |
| URL import flow | Gains structured ingredient extraction + auto-match step | Existing text-only import must still work as fallback |
| AI inspiration / recipe save | Gains same structured extraction step | Existing save-without-ingredients path must still work |
| MealPlan entries | Source of truth for "which recipes did I eat on which day" for nutrition history | MealPlan date range queries power the history views |
| Claude API integration | Powers AI nutrition estimation for unmatched ingredients | Existing API route patterns should be extended, not replaced |

## Open Questions

1. **MealPlan unique constraint vs. 2 meals/day**: The current schema enforces one entry per user per day (`@@unique([date, forUserId])`). "Meine Nährwerte" needs Mittagessen and Abendessen separately. Either the constraint needs a `mealType` discriminator column, or both meals are summed from the single daily entry. This must be resolved before the nutrition history view is built.

2. **USDA English names in a German app**: USDA ingredient names are in English. Auto-matching against user-typed German ingredient names ("Hähnchenbrust" vs "Chicken Breast") will have a high miss rate without German aliases. Options: (a) add a `nameAliases String[]` field to Ingredient, (b) normalize both sides through Claude during matching, (c) use a German-language source (BLS — Bundeslebensmittelschlüssel) instead of USDA.

3. **Retroactive enrichment**: Existing recipes have free-text ingredients only. Should there be a batch enrichment flow (AI parses existing text ingredients and creates RecipeIngredient rows)? Not in spec, but the nutrition history view will be empty until recipes have structured data.

4. **Estimated vs. DB-backed accuracy signaling**: Should the UI distinguish between "calculated from DB" and "AI-estimated" nutrition values? Users may want to know how reliable a figure is. Spec does not specify this distinction in the UI.

## Sources

- Domain knowledge: Standard patterns from MyFitnessPal, Cronometer, Yummly, and similar apps (training data, HIGH confidence for established patterns)
- USDA FoodData Central: https://fdc.nal.usda.gov/ — public domain food composition data (HIGH confidence on availability and format)
- Spec: `/docs/superpowers/specs/2026-03-15-naehrstoffe-design.md` (authoritative for this project)
- Schema: `/prisma/schema.prisma` (authoritative for existing data model)
- Note: WebSearch unavailable during this research session; current-year community patterns not verified
