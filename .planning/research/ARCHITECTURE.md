# Architecture Patterns

**Domain:** Nutritional data layer for existing meal planner (structured ingredients, nutrient calculation, history views)
**Researched:** 2026-03-15

---

## Existing Architecture Baseline

Before describing new additions, the relevant existing patterns must be understood because all new work follows them exactly.

**Framework:** Next.js 15 App Router with `(app)` route group. All authenticated pages live under `src/app/(app)/`. The layout at `src/app/(app)/layout.tsx` checks session and renders `NavBar`.

**Backend:** API routes at `src/app/api/**`. Every route calls `auth()` first, then operates via `prisma`. No separate service layer — logic lives in the route handler. Prisma client is at `src/generated/prisma` (non-standard path — use `@/generated/prisma` for imports, not `@prisma/client`).

**Data access:** Server Components query `prisma` directly. Client Components call API routes via `fetch`. No React Query, no SWR, no client-side caching layer.

**AI calls:** Currently use OpenAI (`gpt-4o-mini`) via the `openai` npm package. The Claude API is listed as the planned AI provider in PROJECT.md but the codebase uses OpenAI. New AI calls should follow the same pattern (whichever provider is configured via env vars).

**UI:** Tailwind CSS only. No component library. Mobile-first, max-width 2xl container (`max-w-2xl`). Bottom nav with 4 tabs (currently: Wochenplan, Rezepte, Inspiration, Familie).

**Existing Recipe model:** `ingredients` field is a freeform `String?`. It is displayed on the recipe detail page by splitting on newlines and joining. It is preserved as a fallback — new structured ingredients do not replace it.

---

## Recommended Architecture for the New Features

### Overview

Three new data-layer additions sit on top of the existing app without requiring structural changes:

```
Ingredient table          — standalone nutritional database
RecipeIngredient table    — join table linking Recipe ↔ Ingredient
MealPlan (unchanged)      — already links User + Recipe + date
```

Three new UI surfaces:

```
RecipeDetail page         — MODIFIED: add NutritionTable component below ingredients
RecipeForm                — MODIFIED: add IngredientEditor panel replacing freetext
Zutatenverwaltung page    — NEW: /zutaten (list, add, edit, delete ingredients)
Naehrstoffe page          — NEW: /naehrstoffe (daily/weekly nutrition history)
NavBar                    — MODIFIED: add 5th tab or use existing Familie/settings area
```

---

### Component Boundaries

| Component | Type | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| `NutritionTable` | Server Component | Renders per-portion nutrient breakdown | Receives pre-calculated totals as props |
| `IngredientEditor` | Client Component | Autocomplete search, add/remove structured ingredients for a recipe | `GET /api/ingredients?search=` |
| `IngredientAdminPage` | Server Component (shell) | Renders ingredient list fetched server-side | `IngredientForm` client component |
| `IngredientForm` | Client Component | Create/edit ingredient with nutrient fields | `POST/PUT /api/ingredients` |
| `NaehrstoffeView` | Client Component | Day/week toggle, week navigation, history | `GET /api/nutrition/history?from=&to=&userId=` |
| `NavBar` | Client Component (modified) | Add 5th nav tab "Nährwerte" at `/naehrstoffe` | — |

---

### Data Flow

#### Ingredient Autocomplete (Manual Recipe Edit)

```
User types in IngredientEditor
  → fetch GET /api/ingredients?search=hackfleisch
  → Server: prisma.ingredient.findMany with icontains on name
  → Returns [{id, name, caloriesPer100g, ...}]
  → Dropdown shown, user selects
  → User enters amount + unit
  → On recipe save: POST /api/recipes/:id/ingredients [{ingredientId, name, amount, unit}]
  → Server creates RecipeIngredient rows, links ingredientId
```

#### Fuzzy Matching (URL Import / AI Save)

```
AI returns structured [{name, amount, unit}] for each ingredient
  → matchIngredientsToDatabase(items) — shared utility function
    → For each item: query prisma.ingredient where name similar to item.name
    → Use PostgreSQL pg_trgm similarity or simple icontains as first pass
    → Score ≥ threshold → set ingredientId
    → Score < threshold → call AI estimation endpoint
  → AI estimation: prompt AI with ingredient name + amount → returns {calories, protein, fat, ...}
  → Store in estimated* fields, ingredientId stays null
  → Create RecipeIngredient rows
```

#### Nutrition Calculation (Recipe Detail)

```
RecipeDetail page (Server Component):
  → prisma.recipe.findUnique({ include: { recipeIngredients: { include: { ingredient: true } } } })
  → calculateNutrition(recipeIngredients, recipe.servings) — pure function
    → For each row: if ingredientId → use Ingredient fields * amount / 100
                    else → use estimated* fields
    → Sum all, divide by servings
  → Pass totals to <NutritionTable> as props
```

#### Nutrition History (Meine Nährwerte)

```
NaehrstoffeView client component mounts
  → fetch GET /api/nutrition/history?from=2026-03-09&to=2026-03-15&userId=me
  → Server: prisma.mealPlan.findMany with date range + forUserId
    → include recipe → recipeIngredients → ingredient
  → calculateNutrition per meal → aggregate by date
  → Return [{date, meals: [{name, nutrition}], dailyTotal}]
  → Client renders day/week toggle, bar or summary rows
```

---

### Patterns to Follow

#### Pattern 1: Shared Nutrition Calculation as a Pure Utility

**What:** Extract the per-portion nutrient calculation into `src/lib/nutrition.ts` as a pure function. Both the recipe detail page and the history API route need it.

**When:** Any time nutrient totals need computing from `RecipeIngredient[]`.

**Example:**
```typescript
// src/lib/nutrition.ts
export type NutritionTotals = {
  calories: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  fiber: number;
};

export function calculateNutritionPerPortion(
  ingredients: RecipeIngredientWithIngredient[],
  servings: number
): NutritionTotals {
  const totals = ingredients.reduce((acc, ri) => {
    const factor = ri.amount / 100;
    const ing = ri.ingredient;
    return {
      calories: acc.calories + (ing ? ing.caloriesPer100g * factor : (ri.caloriesEstimated ?? 0)),
      // ... same for all fields
    };
  }, zeroTotals());
  return divideByServings(totals, servings);
}
```

#### Pattern 2: Ingredient Matching Utility

**What:** A server-side function `matchIngredientByName(name: string)` encapsulates the lookup logic. Called by both the URL import route and the AI save route after they receive structured ingredient lists.

**When:** Any AI-driven recipe creation flow.

**Implementation approach:** Start with Prisma `contains` + `mode: insensitive`. PostgreSQL `pg_trgm` extension can be enabled later for true fuzzy matching (`CREATE EXTENSION IF NOT EXISTS pg_trgm`). The function returns `Ingredient | null` — callers decide what to do with null (trigger AI estimation).

#### Pattern 3: AI Estimation as a Dedicated API Route

**What:** `POST /api/ai/estimate-nutrition` accepts `{name, amount, unit}` and returns estimated nutrient values. Keeps AI logic isolated.

**When:** Called server-side during import flows when no ingredient match is found, not from client.

**Note:** This route should never be called for ingredients that already have a database match — callers must check first.

#### Pattern 4: Ingredient Admin follows existing CRUD pattern

**What:** `/api/ingredients` mirrors the pattern of `/api/recipes` exactly — GET with search, POST to create, PUT `:id` to update, DELETE `:id`. Server Component page at `/zutaten` fetches server-side, `IngredientForm` client component handles mutations.

**When:** All ingredient CRUD.

---

### New vs. Modified: Explicit List

#### New Files

| Path | Type | Purpose |
|------|------|---------|
| `prisma/schema.prisma` (additions) | Schema | Add `Ingredient` and `RecipeIngredient` models |
| `src/lib/nutrition.ts` | Utility | Pure nutrition calculation function |
| `src/lib/ingredient-matching.ts` | Utility | Fuzzy name matching against Ingredient table |
| `src/app/api/ingredients/route.ts` | API Route | GET (search), POST (create) |
| `src/app/api/ingredients/[id]/route.ts` | API Route | PUT (update), DELETE |
| `src/app/api/recipes/[id]/ingredients/route.ts` | API Route | GET, POST structured ingredients for a recipe |
| `src/app/api/ai/estimate-nutrition/route.ts` | API Route | POST: AI fallback nutrition estimation |
| `src/app/api/nutrition/history/route.ts` | API Route | GET history aggregated by date for a user |
| `src/app/(app)/naehrstoffe/page.tsx` | Page (Server shell) | "Meine Nährwerte" entry point |
| `src/app/(app)/zutaten/page.tsx` | Page (Server) | Ingredient list with search |
| `src/app/(app)/zutaten/neu/page.tsx` | Page (Server shell) | New ingredient form page |
| `src/app/(app)/zutaten/[id]/bearbeiten/page.tsx` | Page (Server shell) | Edit ingredient form page |
| `src/components/nutrition-table.tsx` | Server Component | Nutrient breakdown table, props-driven |
| `src/components/ingredient-editor.tsx` | Client Component | Autocomplete + structured ingredient list for recipe editing |
| `src/components/ingredient-form.tsx` | Client Component | Create/edit a single Ingredient record |
| `src/components/naehrstoffe-view.tsx` | Client Component | Day/week toggle + navigation + history rendering |
| `prisma/seeds/ingredients-usda.ts` | Seed script | One-time USDA data import |

#### Modified Files

| Path | What Changes |
|------|-------------|
| `prisma/schema.prisma` | Add `Ingredient`, `RecipeIngredient` models; add `recipeIngredients` relation to `Recipe` |
| `src/app/(app)/rezepte/[id]/page.tsx` | Add `recipeIngredients` include to Prisma query; render `<NutritionTable>` conditionally below ingredients |
| `src/app/(app)/rezepte/[id]/bearbeiten/page.tsx` | Include `recipeIngredients` in fetch; pass to `RecipeForm` |
| `src/components/recipe-form.tsx` | Add `<IngredientEditor>` panel below the existing freetext `ingredients` textarea (keep freetext as fallback display) |
| `src/app/api/recipes/import-url/route.ts` | After creating recipe, call `matchIngredientsToDatabase` on extracted structured ingredients, create `RecipeIngredient` rows |
| `src/app/api/ai/save-recipe/route.ts` | Same: after recipe creation, process structured ingredients |
| `src/components/nav-bar.tsx` | Add "Nährwerte" tab (5th item); add icon |

---

### Prisma Schema Additions

```prisma
model Ingredient {
  id                  String             @id @default(cuid())
  name                String
  category            String?
  caloriesPer100g     Float              @map("calories_per_100g")
  proteinPer100g      Float              @map("protein_per_100g")
  fatPer100g          Float              @map("fat_per_100g")
  saturatedFatPer100g Float              @map("saturated_fat_per_100g")
  carbsPer100g        Float              @map("carbs_per_100g")
  sugarPer100g        Float              @map("sugar_per_100g")
  fiberPer100g        Float              @map("fiber_per_100g")
  createdBy           String             @map("created_by")
  creator             User               @relation(fields: [createdBy], references: [id])
  recipeIngredients   RecipeIngredient[]

  @@index([name])
  @@map("ingredients")
}

model RecipeIngredient {
  id                    String      @id @default(cuid())
  recipeId              String      @map("recipe_id")
  ingredientId          String?     @map("ingredient_id")
  name                  String
  amount                Float
  unit                  String
  caloriesEstimated     Float?      @map("calories_estimated")
  proteinEstimated      Float?      @map("protein_estimated")
  fatEstimated          Float?      @map("fat_estimated")
  saturatedFatEstimated Float?      @map("saturated_fat_estimated")
  carbsEstimated        Float?      @map("carbs_estimated")
  sugarEstimated        Float?      @map("sugar_estimated")
  fiberEstimated        Float?      @map("fiber_estimated")
  recipe                Recipe      @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient            Ingredient? @relation(fields: [ingredientId], references: [id])

  @@map("recipe_ingredients")
}
```

Add to `Recipe` model:
```prisma
recipeIngredients RecipeIngredient[]
```

Add to `User` model:
```prisma
ingredients Ingredient[]
```

---

### Anti-Patterns to Avoid

#### Anti-Pattern 1: Recalculating Nutrition in Every Caller

**What:** Duplicating the `amount * nutrientPer100g / 100` math in the recipe detail page, the history API, and anywhere else nutrients are displayed.

**Why bad:** Formula changes (e.g., unit conversion for "Stück" items) then require updates in multiple places. Drift causes display inconsistencies.

**Instead:** Single `calculateNutritionPerPortion()` in `src/lib/nutrition.ts`. All callers import it.

#### Anti-Pattern 2: Replacing the Freetext Ingredients Field

**What:** Deleting `Recipe.ingredients` (the freetext String) when adding structured ingredients.

**Why bad:** Existing recipes have data there. The recipe detail page renders it. Losing it breaks display for recipes that were never migrated to structured ingredients.

**Instead:** Keep `Recipe.ingredients` as-is. `RecipeIngredient` rows coexist. Show structured nutrition table only when `recipeIngredients.length > 0`.

#### Anti-Pattern 3: Calling AI Estimation from the Client

**What:** Having `IngredientEditor` hit the AI estimation endpoint directly when no match is found during manual entry.

**Why bad:** Exposes AI calls to client, adds latency to the interactive editing flow, and is hard to debounce correctly.

**Instead:** AI estimation only runs server-side during import flows (URL import, AI save). For manual entry: if no match, the user simply adds the ingredient without nutrition data. They can optionally trigger estimation via an explicit "Nährwerte schätzen" button that calls a dedicated endpoint.

#### Anti-Pattern 4: Storing Calculated Totals on the Recipe

**What:** Adding `totalCalories`, `totalProtein`, etc. fields to the `Recipe` model.

**Why bad:** Cached totals go stale whenever `RecipeIngredient` rows or `Ingredient` rows are updated. Invalidation logic is fragile.

**Instead:** Calculate at read time from `RecipeIngredient` + `Ingredient`. For a family-scale app (small dataset), this is fast enough. If performance ever becomes an issue, add database-level views, not denormalized columns.

#### Anti-Pattern 5: Fuzzy Matching with Client-Side String Distance

**What:** Shipping a string-distance library (Levenshtein, etc.) to the browser to do ingredient matching locally.

**Why bad:** Ingredient database can grow to thousands of rows. Client download cost is unnecessary.

**Instead:** All matching runs server-side in `ingredient-matching.ts`. Start with Prisma `contains` + `mode: insensitive`. Enable `pg_trgm` via migration if similarity scoring is needed.

---

### Suggested Build Order

Dependencies dictate this order. Each step is independently deployable.

**Step 1: Schema + Seed** (no UI, unblocks everything else)
- Add `Ingredient` and `RecipeIngredient` models to schema
- Run `prisma migrate`
- Build USDA seed script, run once to populate initial ingredient data
- No UI changes — safe to ship

**Step 2: Ingredient Admin UI** (unblocks manual ingredient management)
- `GET/POST /api/ingredients` and `GET/PUT/DELETE /api/ingredients/[id]`
- `/zutaten` page with list + search
- `IngredientForm` client component
- Adds 5th nav tab "Nährwerte" placeholder (or "Zutaten" — decide on nav structure)
- Enables family members to add/correct ingredients before recipes use them

**Step 3: IngredientEditor in RecipeForm** (unblocks structured recipe data)
- `GET/POST /api/recipes/[id]/ingredients`
- `IngredientEditor` client component with autocomplete
- Modify `RecipeForm` to include it below existing freetext field
- Modify recipe detail page to include `recipeIngredients` in query

**Step 4: NutritionTable on Recipe Detail** (first user-visible payoff)
- `src/lib/nutrition.ts` utility
- `NutritionTable` server component
- Wire into recipe detail page — conditionally shown when structured ingredients exist
- Existing recipes unaffected (no `RecipeIngredient` rows → table stays hidden)

**Step 5: AI Estimation Fallback** (improves import quality)
- `POST /api/ai/estimate-nutrition`
- `src/lib/ingredient-matching.ts`
- Modify `import-url` route and `ai/save-recipe` route to create `RecipeIngredient` rows post-creation
- AI now fills in estimated nutrients for unmatched ingredients on import

**Step 6: Nutrition History View** (final new surface)
- `GET /api/nutrition/history`
- `NaehrstoffeView` client component
- `/naehrstoffe` page
- Nav tab wired to this route

---

### Integration Points Summary

| Existing System | Integration Point | Change Type |
|-----------------|-------------------|-------------|
| `Recipe.ingredients` (freetext) | Preserved, shown alongside structured ingredients | No change |
| `MealPlan` | Read by history API to find which recipes a user ate on which dates | No change to model |
| `prisma.recipe.findUnique` in detail page | Add `include: { recipeIngredients: { include: { ingredient: true } } }` | Modified |
| `RecipeForm` client component | Add `IngredientEditor` panel | Modified |
| `import-url` route | After `prisma.recipe.create`, run ingredient matching + create `RecipeIngredient` rows | Modified |
| `ai/save-recipe` route | Same as import-url | Modified |
| `NavBar` | Add 5th tab | Modified |
| AI provider env var | `estimate-nutrition` route uses same env-var pattern as existing AI routes | New route, same pattern |

---

### Scalability Considerations

This is a 4-person family app. Performance targets are simple: all pages load in under 500ms on a self-hosted VPS.

| Concern | At current scale (family, ~hundreds of recipes) | If shared publicly |
|---------|--------------------------------------------------|--------------------|
| Nutrition calculation | In-memory from `RecipeIngredient` rows — trivially fast | Add DB view or cached aggregate |
| Ingredient search | `icontains` on name is fine | Add `pg_trgm` GIN index |
| History query | Join across `MealPlan` → `Recipe` → `RecipeIngredient` → `Ingredient` for one user, one week | Add composite index on `meal_plans(for_user_id, date)` |
| USDA seed data | ~8000 common foods is manageable in PostgreSQL | No concern |

Add index on `meal_plans(for_user_id, date)` at migration time — it is used by both the existing week planner and the new history query.

---

## Sources

- Codebase inspection: `prisma/schema.prisma`, `src/app/api/**`, `src/app/(app)/**`, `src/components/**` (direct read, HIGH confidence)
- Feature spec: `docs/superpowers/specs/2026-03-15-naehrstoffe-design.md` (direct read, HIGH confidence)
- Project context: `.planning/PROJECT.md` (direct read, HIGH confidence)
- Patterns inferred from existing API routes and component structure (HIGH confidence — consistent across all examined files)
