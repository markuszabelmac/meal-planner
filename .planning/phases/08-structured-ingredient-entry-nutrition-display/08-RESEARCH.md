# Phase 8: Structured Ingredient Entry & Nutrition Display - Research

**Researched:** 2026-03-15
**Domain:** React controlled-list UI, Prisma nested writes, nutrition calculation
**Confidence:** HIGH

## Summary

Phase 8 connects two already-built subsystems: the ingredient database (Phase 6) with its fuzzy-search API, and the recipe form/detail pages that currently only know about freetext ingredients. The work is pure wiring plus new UI — no schema migration required, no new API endpoints needed beyond extending two existing ones.

The central challenge is the ingredient editor inside `RecipeForm`: a dynamic list of rows where each row is (autocomplete search → selected ingredient) + amount + unit dropdown. This is a controlled-list pattern in React, which requires careful key management and state shape. The secondary challenge is computing and displaying totals: sum `amount * ingredient.nutrientPer100g / 100` across all rows that have a linked ingredient, skipping `stueck` rows (no fixed gram conversion), and dividing by `recipe.servings`.

Freetext `Recipe.ingredients` stays as-is. Structured rows supplement it but never replace it.

**Primary recommendation:** Extend `RecipeForm` with a managed array of `StructuredIngredientRow` objects (client state), save them via `recipeIngredients` nested write in PUT/POST, return them in GET, and compute nutrition totals server-side in the detail page using `unitToGrams` from `src/lib/units.ts`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INPUT-01 | User kann beim Rezept-Erstellen Zutaten per Autocomplete aus der Datenbank wählen | Ingredient API GET /api/ingredients?search= already supports fuzzy search ≥2 chars; need autocomplete UI in RecipeForm |
| INPUT-02 | User kann Menge und Einheit pro Zutat eingeben | Unit enum (g/kg/ml/l/stueck/el/tl/prise) already defined; need amount number input + unit select per row |
| VIEW-01 | Rezeptdetailseite zeigt Nährwerte pro Portion | RecipeIngredient rows need to be included in recipe GET/PUT/POST; nutrition totals computed with unitToGrams then divided by servings |
</phase_requirements>

---

## Standard Stack

### Core — already installed, no new dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (useState, useEffect) | 19.2.3 | Controlled list state for ingredient rows | Already in use throughout the codebase |
| Prisma | ^7.4.0 | Nested createMany/deleteMany for RecipeIngredient | Same client used everywhere; `@/generated/prisma/client` import path |
| Next.js API routes | 16.1.6 | Extend POST/PUT /api/recipes to accept recipeIngredients array | Same route pattern already in place |
| Tailwind CSS v4 | ^4 | Styling ingredient editor rows and nutrition table | Project standard |

### No New Dependencies Required
This phase introduces zero new npm packages. All capability is available in React state management, the existing Prisma schema, and the existing ingredient API.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── recipe-form.tsx              # ADD: structured ingredient editor section
│   └── ingredient-row-editor.tsx    # NEW: single row component (optional extract)
├── app/(app)/
│   └── rezepte/[id]/
│       └── page.tsx                 # ADD: nutrition table section
├── app/api/
│   └── recipes/
│       ├── route.ts                 # EXTEND: POST accepts recipeIngredients[]
│       └── [id]/route.ts           # EXTEND: GET includes recipeIngredients, PUT replaces them
└── lib/
    └── units.ts                     # EXISTS: unitToGrams — use as-is
```

### Pattern 1: Controlled List of Ingredient Rows (Client State)

**What:** An array in React state where each element represents one structured ingredient row. Each row tracks the raw search text, the resolved ingredient object, the amount, and the unit. The list renders one editor row per element, with add/remove controls.

**When to use:** Any time the user builds an ordered collection with per-item structured data where items can be added, removed, or edited independently.

**State shape:**
```typescript
// Source: project-derived pattern matching existing controlled inputs
type IngredientRowState = {
  id: string;                    // client-only key (crypto.randomUUID() or index)
  searchText: string;            // what the user typed in the autocomplete
  ingredientId: string | null;   // set when user picks from dropdown
  ingredientName: string;        // display name after selection
  amount: string;                // controlled input value (string to allow partial entry)
  unit: Unit;                    // from Unit enum
  suggestions: IngredientOption[];  // current autocomplete results
  showDropdown: boolean;
};
```

**Key implementation rules:**
- Use a stable `id` (UUID) as the React `key`, never array index — avoids re-mount on reorder
- `amount` stays as string in state, parsed to `parseFloat` only on submit
- Clearing `searchText` clears `ingredientId` (deselects) — user must re-pick

### Pattern 2: Autocomplete with Debounced Fetch

**What:** On each keystroke in the ingredient search input, fetch `/api/ingredients?search=<text>` (min 2 chars). Show results in a positioned dropdown. On selection, store `ingredientId` and collapse dropdown.

**When to use:** Any search-as-you-type against a server-side fuzzy index (pg_trgm).

```typescript
// Source: ingredient API already accepts this query param (see ingredients/route.ts)
// Debounce is optional — existing admin page uses no debounce and pg_trgm is fast
// STATE.md decision: "List page uses no debounce — pg_trgm is fast"
async function fetchSuggestions(search: string) {
  if (search.length < 2) return [];
  const res = await fetch(`/api/ingredients?search=${encodeURIComponent(search)}`);
  return res.json() as Promise<IngredientOption[]>;
}
```

**Dropdown accessibility consideration:** The dropdown must close on outside click and on Escape. Use a `useEffect` with a document click listener or a `onBlur` with a small timeout (150ms) to allow click on suggestion to register before blur fires.

### Pattern 3: Prisma Nested Write — Replace Strategy

**What:** When saving a recipe (POST = create, PUT = update), send the full `recipeIngredients` array. The API deletes all existing rows for that recipe then creates the new set atomically in a transaction.

**When to use:** When a list is fully managed by the form (not append-only). Replace strategy is simpler than diffing individual row changes.

```typescript
// Source: Prisma docs nested writes pattern — verified against schema
// For PUT /api/recipes/[id]:
await prisma.$transaction([
  prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
  prisma.recipe.update({
    where: { id },
    data: {
      // ...recipe fields...
      recipeIngredients: {
        create: structuredIngredients.map((row) => ({
          ingredientId: row.ingredientId || null,
          amount: parseFloat(row.amount),
          unit: row.unit as Unit,
        })),
      },
    },
    include: {
      creator: { select: { displayName: true } },
      recipeIngredients: {
        include: { ingredient: true },
      },
    },
  }),
]);

// For POST /api/recipes (create):
await prisma.recipe.create({
  data: {
    // ...recipe fields...
    recipeIngredients: {
      create: structuredIngredients.map(/* same mapping */),
    },
  },
  include: {
    recipeIngredients: { include: { ingredient: true } },
  },
});
```

**Important:** `RecipeIngredient.onDelete: Cascade` is already set in schema — deleting the recipe also deletes its rows automatically. No extra cleanup needed.

### Pattern 4: Nutrition Calculation (Server-Side, in Detail Page)

**What:** The recipe detail page already fetches the recipe server-side via Prisma. Extend that query to include `recipeIngredients { ingredient }`, then compute totals before rendering.

**When to use:** Pure calculation from already-fetched data. No separate API call needed.

```typescript
// Source: src/lib/units.ts — unitToGrams already exported
import { unitToGrams } from "@/lib/units";

function computeNutritionTotals(
  recipeIngredients: RecipeIngredientWithIngredient[],
  servings: number | null,
) {
  let totalKcal = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
  let hasAnyData = false;

  for (const ri of recipeIngredients) {
    if (!ri.ingredient) continue;          // no linked ingredient — skip
    const grams = unitToGrams(ri.amount, ri.unit);
    if (grams === null) continue;          // stueck — no fixed conversion, skip
    const factor = grams / 100;
    totalKcal    += ri.ingredient.kcalPer100g    * factor;
    totalProtein += (ri.ingredient.proteinPer100g ?? 0) * factor;
    totalFat     += (ri.ingredient.fatPer100g    ?? 0) * factor;
    totalCarbs   += (ri.ingredient.carbsPer100g  ?? 0) * factor;
    hasAnyData = true;
  }

  if (!hasAnyData) return null;   // signal: no nutrition data to show
  const portions = servings && servings > 0 ? servings : 1;
  return {
    kcal:    Math.round(totalKcal    / portions),
    protein: Math.round(totalProtein / portions * 10) / 10,
    fat:     Math.round(totalFat     / portions * 10) / 10,
    carbs:   Math.round(totalCarbs   / portions * 10) / 10,
  };
}
```

**Rounding:** kcal → integer (no decimals). Macros → one decimal place. This matches German nutritional labelling convention.

### Anti-Patterns to Avoid

- **Using array index as React key for ingredient rows:** Causes inputs to lose focus and values to shift when a middle row is removed. Use stable UUIDs.
- **Computed nutrition in a client component with a separate fetch:** The detail page is already a server component fetching the recipe. Keep nutrition calculation server-side — no additional round trip.
- **Storing `estimatedKcal`/`estimatedProtein`/`estimatedFat`/`estimatedCarbs` in Phase 8:** These fields in `RecipeIngredient` are reserved for Phase 9 (AI fallback for stueck). Phase 8 only stores `ingredientId`, `amount`, `unit`. Do not populate estimated fields.
- **Blocking recipe save if no structured ingredients:** Freetext `ingredients` field stays as fallback. Save must succeed with zero structured ingredients attached.
- **Showing nutrition table when there is nothing to show:** Only render the nutrition section when `computeNutritionTotals` returns non-null (i.e., at least one linked, gram-convertible ingredient exists).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy ingredient search | Custom similarity scoring | `GET /api/ingredients?search=` (pg_trgm, already built) | Server-side pg_trgm index handles German/English name matching; Phase 7 already exposes this |
| Unit-to-grams conversion | Inline conversion table | `unitToGrams()` from `src/lib/units.ts` | Already handles all Unit enum values including null for stueck |
| RecipeIngredient persistence | Custom SQL INSERT/DELETE | Prisma nested writes + `deleteMany` + `create` in `$transaction` | Handles FK constraints, cascade, atomicity |
| Dropdown close-on-outside-click | Global click handler manually managed | `onBlur` with 150ms timeout (simple) or a `useRef`+`useEffect` pattern | Prevents complex global state; timeout lets click on suggestion register |

**Key insight:** The most complex parts of this feature (fuzzy search backend, unit conversion, DB schema) are already done. Phase 8 is primarily UI assembly.

---

## Common Pitfalls

### Pitfall 1: onBlur Fires Before onClick on Suggestion Item

**What goes wrong:** User clicks a suggestion in the dropdown. The input fires `onBlur` first, hiding the dropdown and cancelling the click before it registers.

**Why it happens:** Browser fires blur before mousedown/click.

**How to avoid:** Use `onMouseDown` (not `onClick`) on suggestion list items, which fires before blur. Alternatively, use a 150ms timeout in the `onBlur` handler before hiding the dropdown — long enough for the click to register.

**Warning signs:** Dropdown disappears on click, no ingredient gets selected.

### Pitfall 2: Stale Suggestions After Fast Typing

**What goes wrong:** User types "Tom", then quickly types "Tomato". The "Tom" fetch returns after "Tomato" fetch, overwriting correct results.

**Why it happens:** Race condition on async fetches without cancellation.

**How to avoid:** Track a `requestId` counter in the component. Increment on each fetch. In the `.then()` callback, only apply results if the counter still matches. OR use `AbortController` and abort the previous fetch on each keystroke.

**Warning signs:** Suggestions briefly show correct results, then revert to older/wrong results.

### Pitfall 3: Saving Rows with Empty Amount

**What goes wrong:** User adds a row but does not fill in amount, then saves. `parseFloat("")` returns `NaN`, Prisma throws a type error.

**Why it happens:** No client-side validation before submit.

**How to avoid:** Filter out rows where `amount` is empty/NaN or `ingredientId` is null before sending to API. Alternatively, validate server-side and return a 400.

**Warning signs:** Recipe saves but RecipeIngredients are not created, or API 500 error.

### Pitfall 4: EditRecipePage Does Not Load Existing RecipeIngredients

**What goes wrong:** User opens "Bearbeiten" for an existing recipe. The structured ingredient rows are empty even though they were saved.

**Why it happens:** `EditRecipePage` currently fetches `prisma.recipe.findUnique({ where: { id } })` without including `recipeIngredients`. The `RecipeForm` initial prop has no `recipeIngredients` field.

**How to avoid:** Extend both the edit page query and `RecipeForm`'s `initial` prop type to include `recipeIngredients`. Pre-populate the row state in `useState` initializer.

**Warning signs:** Round-trip save works, but existing rows disappear on next edit.

### Pitfall 5: nutrition Totals Show for Recipes with Only stueck Ingredients

**What goes wrong:** All ingredients in a recipe use `stueck` (e.g., "2 Stück Eier"). `unitToGrams` returns null for each. Nutrition table renders 0 kcal, 0g protein — which looks like a data error, not "unknown".

**Why it happens:** Showing 0 vs. showing nothing are both technically valid when totals are zero.

**How to avoid:** Use the `hasAnyData` flag. If no row produced a gram conversion, return null from `computeNutritionTotals` and do not render the nutrition section at all.

---

## Code Examples

Verified patterns from existing codebase:

### Prisma Import Path (from STATE.md decision)
```typescript
// Source: STATE.md — "[Phase 07-ingredient-admin-ui]: Prisma import path is @/generated/prisma/client"
import { Unit } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
```

### Ingredient Autocomplete Fetch (existing API)
```typescript
// Source: src/app/api/ingredients/route.ts — search requires >= 2 chars
const res = await fetch(`/api/ingredients?search=${encodeURIComponent(text)}`);
const suggestions = await res.json();
// Returns: { id, name, nameEn, kcalPer100g, proteinPer100g, fatPer100g, ... }[]
```

### Unit Enum Values for Select Dropdown (German labels)
```typescript
// Source: prisma/schema.prisma enum Unit
const UNIT_LABELS: Record<string, string> = {
  g:      "g",
  kg:     "kg",
  ml:     "ml",
  l:      "l",
  stueck: "Stück",
  el:     "EL",
  tl:     "TL",
  prise:  "Prise",
};
```

### RecipeIngredient Include for GET /api/recipes/[id]
```typescript
// Source: prisma/schema.prisma — RecipeIngredient has ingredient relation
const recipe = await prisma.recipe.findUnique({
  where: { id },
  include: {
    creator: { select: { displayName: true } },
    recipeIngredients: {
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            kcalPer100g: true,
            proteinPer100g: true,
            fatPer100g: true,
            carbsPer100g: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    },
  },
});
```

### API Body Shape for recipeIngredients
```typescript
// Shape sent from RecipeForm to POST/PUT:
type StructuredIngredientPayload = {
  ingredientId: string | null;
  amount: number;           // already parsed, NaN rows filtered out
  unit: string;             // Unit enum value
};
```

### Nutrition Table UI Pattern (German, consistent with project)
```tsx
{/* Nährwerte — only rendered when nutrition !== null */}
{nutrition && (
  <div className="mb-6">
    <h3 className="mb-2 font-semibold">Nährwerte pro Portion</h3>
    <div className="rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="px-4 py-2 font-medium">Kalorien</td>
            <td className="px-4 py-2 text-right">{nutrition.kcal} kcal</td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-2">Protein</td>
            <td className="px-4 py-2 text-right">{nutrition.protein} g</td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-2">Fett</td>
            <td className="px-4 py-2 text-right">{nutrition.fat} g</td>
          </tr>
          <tr>
            <td className="px-4 py-2">Kohlenhydrate</td>
            <td className="px-4 py-2 text-right">{nutrition.carbs} g</td>
          </tr>
        </tbody>
      </table>
      {hasSkippedStueck && (
        <p className="px-4 pb-2 text-xs text-muted">
          * Zutaten mit Einheit "Stück" sind nicht eingerechnet.
        </p>
      )}
    </div>
  </div>
)}
```

---

## API Changes Summary

Both existing API routes need extension. No new routes needed.

### POST /api/recipes (create)
- Accept optional `recipeIngredients: StructuredIngredientPayload[]` in body
- Add `recipeIngredients: { create: [...] }` to `prisma.recipe.create` data
- Include `recipeIngredients` in response

### PUT /api/recipes/[id] (update)
- Accept optional `recipeIngredients: StructuredIngredientPayload[]` in body
- Use `$transaction([deleteMany(...), update(...)])` to atomically replace rows
- Include `recipeIngredients` in response

### GET /api/recipes/[id] (single recipe)
- Add `recipeIngredients: { include: { ingredient: ... } }` to include clause
- The `RecipeDetailModal` fetches via this route — it will automatically get nutrition data

### GET /api/recipes (list)
- No change — list view does not show nutrition

---

## Files to Modify

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/components/recipe-form.tsx` | Extend | Add `StructuredIngredientEditor` section; extend `RecipeData` type; extend `handleSubmit` payload |
| `src/app/(app)/rezepte/[id]/page.tsx` | Extend | Include recipeIngredients in Prisma query; compute nutrition; render nutrition table |
| `src/app/(app)/rezepte/[id]/bearbeiten/page.tsx` | Extend | Include recipeIngredients in Prisma query; pass to RecipeForm initial prop |
| `src/app/api/recipes/route.ts` | Extend | POST handler: accept + create recipeIngredients |
| `src/app/api/recipes/[id]/route.ts` | Extend | GET: include recipeIngredients; PUT: replace recipeIngredients in transaction |
| `src/components/recipe-detail-modal.tsx` | Extend | Extend Recipe type to include recipeIngredients; render nutrition table |

**New files (optional):**
- `src/components/ingredient-row-editor.tsx` — extract the per-row autocomplete UI if recipe-form.tsx grows too large (>400 lines). Not mandatory.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ingredient search via client-side filter of loaded list | Server-side pg_trgm fuzzy match | Phase 6 (2026-03-15) | DB does the work; no 9k-row payload to client |
| No structured ingredients | RecipeIngredient table with optional ingredientId | Phase 6 schema | Phase 8 can now wire UI to existing schema |
| Freetext-only ingredient display | Freetext + structured nutrition table (side by side) | Phase 8 (this phase) | Users see real nutrition data when structured data exists |

---

## Open Questions

1. **Should the modal (`recipe-detail-modal.tsx`) show nutrition?**
   - What we know: The modal fetches via `GET /api/recipes/[id]` which will be extended to include recipeIngredients. Nutrition can be computed client-side using the same logic.
   - What's unclear: No explicit user requirement for nutrition in the modal (VIEW-01 says "Rezeptdetailseite"). Including it in the modal is a UX bonus.
   - Recommendation: Include nutrition in the modal — same data comes back from the API anyway, and the modal is shown in the week planner context where nutrition is most relevant. Keep it simple: same table component, rendered conditionally.

2. **Display order of freetext vs. structured ingredients on the detail page**
   - What we know: Both must coexist. Freetext is the existing field; structured is new.
   - What's unclear: Whether to show both in the same section or in separate sections.
   - Recommendation: Show structured ingredient list (with amounts) first when it exists. Show the freetext fallback section only when there are no structured ingredients. This avoids redundant display when both exist but keeps freetext visible for recipes not yet migrated.

3. **Should the ingredient editor row show a live nutrition preview per row?**
   - What we know: Not required by INPUT-01, INPUT-02, or VIEW-01.
   - Recommendation: Defer to Phase 9 or later. Keep Phase 8 focused on saving the data correctly and showing totals on the detail page.

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — RecipeIngredient model, Unit enum, Ingredient fields, cascade delete behavior
- `src/lib/units.ts` — unitToGrams function, UNIT_TO_GRAMS constants, null-for-stueck decision
- `src/app/api/ingredients/route.ts` — fuzzy search API, min-2-char requirement, return shape
- `.planning/STATE.md` — architectural decisions: freetext fallback, pg_trgm server-side, no-debounce decision, Prisma import path

### Secondary (MEDIUM confidence)
- Prisma nested writes pattern (`create` inside `data`, `deleteMany` + `update` in `$transaction`) — standard Prisma v5+ pattern verified against schema structure
- React controlled-list with UUID keys — standard React pattern; verified as correct approach for dynamic forms

### Tertiary (LOW confidence)
- `onMouseDown` vs `onClick` for dropdown item selection — widely documented browser behavior; not formally verified against React 19 specifically

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all libraries already in use
- Architecture: HIGH — all patterns derived directly from existing codebase files
- API changes: HIGH — schema already supports the data model, just need include/write extensions
- Pitfalls: HIGH — derived from reading actual code (blurring, race conditions in autocomplete, edit-page round-trip)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack, no fast-moving dependencies)
