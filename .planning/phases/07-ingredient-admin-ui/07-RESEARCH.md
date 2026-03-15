# Phase 7: Ingredient Admin UI - Research

**Researched:** 2026-03-15
**Domain:** Next.js App Router CRUD UI with pg_trgm fuzzy search, German locale
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-05 | Zutatenverwaltung: User kann Zutaten suchen, hinzufügen, bearbeiten, löschen | Full CRUD API + list/form pages modeled on recipe pattern; pg_trgm search via `$queryRaw` |

</phase_requirements>

---

## Summary

Phase 7 delivers a complete ingredient management UI: a searchable list of all 5,265+ seeded ingredients plus the ability to add custom ingredients, edit any ingredient's nutritional values, and delete custom entries. The Ingredient model is fully defined in the schema — no migrations required. The only new infrastructure is a `/api/ingredients` REST API and a `/zutaten` page group.

The project uses Next.js 16 App Router, Prisma 7, Tailwind CSS 4, and plain React state (no external form or data-fetching libraries). All existing CRUD features (recipes) follow a consistent pattern: `"use client"` list page with local `useState`/`fetch`, server-rendered detail pages using direct Prisma calls, a shared form component, and an inline delete-confirm button component. Phase 7 must mirror this pattern exactly — no new libraries, no deviations.

The navigation bar has 4 bottom-nav items. A 5th item ("Zutaten") fits in the same flex row with the same icon/label pattern. A suitable icon from the existing Material Symbols SVG vocabulary (e.g., `inventory_2` or `set_meal`) can be added to `icons.tsx` without any npm install.

**Primary recommendation:** Model every file after the recipe pattern. The list page is a client component with debounced search → `/api/ingredients?search=`, the form is a shared `IngredientForm` component, delete requires inline two-step confirmation. pg_trgm search happens server-side via a raw similarity query; no client-side filtering.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Pages, API routes | Already in use |
| Prisma Client | ^7.4.0 | DB access in API routes | Already in use |
| Tailwind CSS | ^4 | Styling | Already in use |
| React 19 | 19.2.3 | Client state | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-auth v5 | beta.30 | Session auth check in API routes | Every API route; pattern: `const session = await auth()` |
| `$queryRaw` (Prisma) | built-in | pg_trgm fuzzy similarity queries | Ingredient search — Prisma ORM cannot express `similarity()` or `% ` operator natively |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `fetch` + `useState` | SWR/React Query | Project standard is plain fetch; no cache invalidation complexity needed here |
| `$queryRaw` for search | Prisma `contains` insensitive | `contains` uses `ILIKE` — no fuzzy matching; pg_trgm already indexed, use it |
| Inline delete confirm | Modal dialog | Recipe pattern uses inline two-step button; stay consistent |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (app)/
│   │   └── zutaten/
│   │       ├── page.tsx              # Client: list + search
│   │       ├── neu/
│   │       │   └── page.tsx          # New ingredient form
│   │       └── [id]/
│   │           ├── page.tsx          # Detail/view (optional — see note)
│   │           └── bearbeiten/
│   │               └── page.tsx      # Edit form
│   └── api/
│       └── ingredients/
│           ├── route.ts              # GET (list/search), POST (create)
│           └── [id]/
│               └── route.ts          # PUT (update), DELETE
├── components/
│   ├── ingredient-form.tsx           # Shared create/edit form
│   └── delete-ingredient-button.tsx  # Inline two-step confirm
```

**Note on detail page:** Ingredients are data records, not content pages. A dedicated `/zutaten/[id]` detail view is likely unnecessary — the list row can open an edit form directly (link to `/zutaten/[id]/bearbeiten`), matching the recipe pattern where edit is accessible from the detail page. Skip a standalone detail page unless the planner determines it adds value.

### Pattern 1: Client List Page with Server Search

The list page is a `"use client"` component. Search input is controlled state. `useEffect` fires on `search` change and calls `/api/ingredients?search=`. Loading state shown while fetching.

**What:** Debounced or immediate-fetch search against the API
**When to use:** Any time the full dataset is too large to ship to client (5,265 rows)

```typescript
// Matches pattern in src/app/(app)/rezepte/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function ZutatenPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/ingredients?${params}`)
      .then((r) => r.json())
      .then((data) => { setIngredients(data); setLoading(false); });
  }, [search]);
  // ...
}
```

### Pattern 2: pg_trgm Search in API Route

When a search query is present, use `$queryRaw` with the `%` similarity operator. When no query, use a plain `findMany` with a row limit.

**What:** Server-side fuzzy search using the GIN index established in Phase 6
**When to use:** `search` param is non-empty

```typescript
// Source: Prisma docs on $queryRaw + project decision from Phase 6
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

// With search:
const results = await prisma.$queryRaw<Ingredient[]>(
  Prisma.sql`
    SELECT id, name, name_en as "nameEn", kcal_per_100g as "kcalPer100g",
           protein_per_100g as "proteinPer100g", fat_per_100g as "fatPer100g",
           carbs_per_100g as "carbsPer100g", is_custom as "isCustom"
    FROM ingredients
    WHERE name % ${search} OR name_en % ${search}
    ORDER BY GREATEST(similarity(name, ${search}), similarity(name_en, ${search})) DESC
    LIMIT 50
  `
);

// Without search (initial load):
const results = await prisma.ingredient.findMany({
  orderBy: [{ isCustom: "desc" }, { name: "asc" }],
  take: 100,
});
```

### Pattern 3: Shared IngredientForm Component

Mirrors `RecipeForm` — receives optional `initial` data, handles both create (POST) and update (PUT) depending on presence of `initial.id`.

**What:** Single form component for both `/zutaten/neu` and `/zutaten/[id]/bearbeiten`
**When to use:** Always — never duplicate form markup

```typescript
// Pattern from src/components/recipe-form.tsx
export function IngredientForm({ initial }: { initial?: IngredientData }) {
  const isEdit = !!initial?.id;
  const url = isEdit ? `/api/ingredients/${initial.id}` : "/api/ingredients";
  const method = isEdit ? "PUT" : "POST";
  // fetch on submit, redirect to /zutaten on success
}
```

### Pattern 4: Inline Delete Confirmation

Mirrors `DeleteRecipeButton` — two states: "Löschen" button (shows confirm), then "Ja, löschen" + "Nein" buttons.

```typescript
// Pattern from src/components/delete-recipe-button.tsx
export function DeleteIngredientButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  // DELETE /api/ingredients/[id], then router.push("/zutaten") + router.refresh()
}
```

### Pattern 5: Navigation Bar Addition

Add a 5th item to the `navItems` array in `src/components/nav-bar.tsx`. The bottom nav uses `flex-1` on each item, so 5 items each get 20% width — still usable on 375px screens (iPhone SE), though tight. The icon + label must be added to `icons.tsx`.

```typescript
// src/components/nav-bar.tsx
const navItems = [
  { href: "/", label: "Wochenplan", Icon: CalendarIcon },
  { href: "/rezepte", label: "Rezepte", Icon: MenuBookIcon },
  { href: "/inspiration", label: "Inspiration", Icon: LightbulbIcon },
  { href: "/familie", label: "Familie", Icon: GroupIcon },
  { href: "/zutaten", label: "Zutaten", Icon: GroceryIcon },  // new
];
```

**Icon suggestion:** Material Symbols `grocery` or `nutrition` path (same SVG format as existing icons, viewBox `0 -960 960 960`).

### Anti-Patterns to Avoid
- **Shipping all 5,265 ingredients to the client:** The list page must not `fetch("/api/ingredients")` without pagination or a search limit. Always use `take: 100` as default load or require a search term to show results.
- **Filtering client-side with `.filter()`:** Search must hit the API — pg_trgm similarity requires server-side SQL.
- **Allowing delete of USDA-seeded (non-custom) ingredients:** USDA entries have `isCustom: false`. The delete button should only render (or the API should only allow deletion) when `isCustom === true`. Editing nutrition values of seeded entries is fine.
- **Using `$queryRaw` for write operations:** Only use raw SQL for the similarity search GET. All mutations (POST, PUT, DELETE) use regular Prisma methods (`create`, `update`, `delete`).
- **Number fields as strings in form state:** Nutritional values are `Float` in the DB. Parse with `parseFloat()` before submit; validate > 0 for kcal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text search | Client-side Fuse.js or filter | pg_trgm `$queryRaw` via existing GIN index | Index already exists from Phase 6; shipping 5k rows kills mobile perf |
| Form validation | Custom validation framework | Native HTML `required`, `min`, `type="number"` | Matches recipe-form pattern; sufficient for numeric nutrition fields |
| Confirmation dialog | Custom modal overlay | Inline two-step button (recipe pattern) | Simpler, already established UX pattern |

---

## Common Pitfalls

### Pitfall 1: Raw SQL Column Aliases Must Match TypeScript Interface
**What goes wrong:** `$queryRaw` returns raw DB column names (`kcal_per_100g`), but TypeScript type uses camelCase (`kcalPer100g`). If aliases are missing in the SQL, runtime access will fail silently (returns `undefined`).
**Why it happens:** Prisma does not transform raw query results.
**How to avoid:** Always alias every column in `$queryRaw`: `kcal_per_100g as "kcalPer100g"`. Quote aliases to preserve case.
**Warning signs:** Nutritional values show as `undefined` in the UI despite data existing in DB.

### Pitfall 2: Deleting Ingredients with RecipeIngredient References
**What goes wrong:** If a seeded or custom ingredient is referenced by a `RecipeIngredient` row, a plain `prisma.ingredient.delete()` will succeed because `onDelete: SetNull` is set on the relation — the `ingredientId` column will be nulled. This is the intended behavior but the user should understand they are detaching the ingredient from recipes.
**Why it happens:** Schema uses `onDelete: SetNull` on `RecipeIngredient.ingredient` relation (confirmed in schema.prisma line 102).
**How to avoid:** Inform the user in the delete confirmation that linked recipes will lose the structured ingredient link. No cascade-delete concern — no accidental recipe deletion.
**Warning signs:** None — this is correct behavior, just needs clear UX copy.

### Pitfall 3: Bottom Nav with 5 Items on Small Screens
**What goes wrong:** At 375px (iPhone SE), 5 items at `flex-1` leaves ~75px each — enough for the icon but labels may truncate or wrap.
**Why it happens:** Current 4-item nav gives ~94px each; 5 items reduces to ~75px.
**How to avoid:** Use short German labels: "Wochenplan" (already 9 chars) is the longest. "Zutaten" (7 chars) is fine. Consider `text-[10px]` or reducing padding from `py-2.5` to `py-2` if it looks crowded.
**Warning signs:** Labels wrap to two lines at 375px.

### Pitfall 4: pg_trgm Threshold and Empty Results
**What goes wrong:** Default pg_trgm similarity threshold is 0.3 — searches for very short strings (1-2 chars) return no results because similarity scores are too low.
**Why it happens:** The `%` operator uses `pg_trgm.similarity_threshold` (default 0.3). Short queries have small trigram sets.
**How to avoid:** Use `LIMIT 50` with `ORDER BY similarity DESC` rather than filtering with `WHERE name % search`. Alternatively, fall back to `ILIKE '%search%'` for queries shorter than 3 characters.
**Warning signs:** User types "Ei" and sees no results despite "Eier", "Eiweiß" existing.

### Pitfall 5: Prisma Generated Client Path
**What goes wrong:** Import from wrong path — `@prisma/client` vs. `@/generated/prisma`.
**Why it happens:** The schema uses `output = "../src/generated/prisma"` (custom output path).
**How to avoid:** All Prisma type imports must use `import { Prisma } from "@/generated/prisma"` (as seen in existing routes that use `import { prisma } from "@/lib/db"`).
**Warning signs:** TypeScript errors on `Prisma.sql` or enum types.

---

## Code Examples

### GET /api/ingredients with pg_trgm Search

```typescript
// src/app/api/ingredients/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  if (search.length >= 2) {
    const results = await prisma.$queryRaw<IngredientRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          name_en AS "nameEn",
          kcal_per_100g AS "kcalPer100g",
          protein_per_100g AS "proteinPer100g",
          fat_per_100g AS "fatPer100g",
          carbs_per_100g AS "carbsPer100g",
          is_custom AS "isCustom"
        FROM ingredients
        WHERE name % ${search} OR name_en % ${search}
           OR name ILIKE ${'%' + search + '%'}
        ORDER BY GREATEST(
          similarity(name, ${search}),
          similarity(COALESCE(name_en, ''), ${search})
        ) DESC
        LIMIT 50
      `
    );
    return NextResponse.json(results);
  }

  // No search: return first 100 ordered by custom-first, then alpha
  const results = await prisma.ingredient.findMany({
    orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    take: 100,
    select: {
      id: true, name: true, nameEn: true,
      kcalPer100g: true, proteinPer100g: true,
      fatPer100g: true, carbsPer100g: true, isCustom: true,
    },
  });
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();
  const { name, nameEn, kcalPer100g, proteinPer100g, fatPer100g,
          satFatPer100g, carbsPer100g, sugarPer100g, fiberPer100g } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }
  if (typeof kcalPer100g !== "number" || kcalPer100g < 0) {
    return NextResponse.json({ error: "Kalorien ungültig" }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      kcalPer100g,
      proteinPer100g: proteinPer100g ?? null,
      fatPer100g: fatPer100g ?? null,
      satFatPer100g: satFatPer100g ?? null,
      carbsPer100g: carbsPer100g ?? null,
      sugarPer100g: sugarPer100g ?? null,
      fiberPer100g: fiberPer100g ?? null,
      isCustom: true,   // always true for user-created entries
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
```

### DELETE Protection for USDA Entries

```typescript
// src/app/api/ingredients/[id]/route.ts (DELETE handler)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  if (!ingredient.isCustom) {
    return NextResponse.json({ error: "USDA-Zutaten können nicht gelöscht werden" }, { status: 403 });
  }

  await prisma.ingredient.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

### Icon Addition to icons.tsx

```typescript
// Material Symbols "grocery" icon (viewBox "0 -960 960 960")
export function GroceryIcon({ className }: { className?: string }) {
  return (
    <svg {...defaultProps} className={className}>
      <path d="M280-80q-33 0-56.5-23.5T200-160v-480q-17 0-28.5-11.5T160-680v-80q0-17 11.5-28.5T200-800h560q17 0 28.5 11.5T800-760v80q0 17-11.5 28.5T760-640v480q0 33-23.5 56.5T680-80H280Zm0-560v480h400v-480H280Zm80 400h240v-80H360v80Zm0-160h240v-80H360v80Zm-80-320v80h400v-80H280Z"/>
    </svg>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma v4 `output` default `node_modules/.prisma` | Custom output `../src/generated/prisma` | Phase 6 (already in place) | Import path is `@/generated/prisma`, not `@prisma/client` |
| Next.js Pages Router API routes | App Router Route Handlers | v1.0 | Dynamic params are `Promise<{id: string}>` — must `await params` |

**Deprecated/outdated:**
- `params.id` directly (without await): Next.js 15+ requires `await params` in route handlers and async server components — already established in `src/app/api/recipes/[id]/route.ts` line 15.

---

## Open Questions

1. **Should non-custom (USDA) ingredients be editable?**
   - What we know: `isCustom: false` marks USDA entries. No edit restriction exists in the schema.
   - What's unclear: Whether a user should be able to correct a seeded nutrition value (e.g., if USDA data is wrong for their use case).
   - Recommendation: Allow editing all ingredients' nutritional values; restrict delete to `isCustom: true` only. This gives maximum utility without risking data loss of the seeded corpus.

2. **Should the list show all 5,265 ingredients by default, or require a search term?**
   - What we know: Recipe list loads all recipes on mount. But recipes are typically < 100; ingredients are 5,265.
   - What's unclear: How the UX should feel — "browse all" vs "search-first".
   - Recommendation: Default load = first 100 (custom-first, then alphabetical). Show search prompt "Zutat suchen..." prominently. This matches mobile-first performance expectations.

3. **Where does the "Zutaten" nav item fit visually with 5 items?**
   - What we know: Current nav has 4 items with `flex-1`. 5 items still fits physically at 375px.
   - What's unclear: Whether "Zutaten" should replace an existing item or if 5 items is acceptable.
   - Recommendation: Add as 5th item. "Familie" is lower-frequency; "Zutaten" is an admin tool. Consider making the label shorter if needed (the German word "Zutaten" is already compact at 7 characters).

---

## Validation Architecture

> nyquist_validation key is absent from config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in project |
| Config file | None — Wave 0 must install |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-05 (search) | GET /api/ingredients?search= returns similarity-ranked results | integration | `npx jest src/app/api/ingredients/route.test.ts` | Wave 0 |
| VIEW-05 (create) | POST /api/ingredients creates isCustom=true ingredient | integration | `npx jest src/app/api/ingredients/route.test.ts` | Wave 0 |
| VIEW-05 (edit) | PUT /api/ingredients/[id] updates nutritional values | integration | `npx jest src/app/api/ingredients/[id]/route.test.ts` | Wave 0 |
| VIEW-05 (delete custom) | DELETE /api/ingredients/[id] succeeds for isCustom=true | integration | `npx jest src/app/api/ingredients/[id]/route.test.ts` | Wave 0 |
| VIEW-05 (delete USDA) | DELETE /api/ingredients/[id] returns 403 for isCustom=false | integration | `npx jest src/app/api/ingredients/[id]/route.test.ts` | Wave 0 |

**Note:** This project has no test infrastructure. Given the family-app context and the straightforward CRUD nature of this phase, the planner may reasonably decide to rely on manual testing for this phase and defer test infrastructure setup to a dedicated phase. Flag this as a planning decision.

### Wave 0 Gaps
- [ ] No test framework installed — would need `jest` + `@types/jest` + Next.js jest config
- [ ] No test directory exists

*(If the planner opts out of automated testing for this phase, document the manual test checklist instead.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/app/(app)/rezepte/page.tsx` — client list pattern
- Direct code inspection: `src/app/api/recipes/route.ts` + `[id]/route.ts` — API route pattern
- Direct code inspection: `src/components/recipe-form.tsx` — form component pattern
- Direct code inspection: `src/components/delete-recipe-button.tsx` — inline delete confirm
- Direct code inspection: `src/components/nav-bar.tsx` — nav structure
- Direct code inspection: `prisma/schema.prisma` — Ingredient model fields and relations
- Direct code inspection: `.planning/phases/06-schema-data-foundation/06-CONTEXT.md` — Phase 6 decisions on pg_trgm and isCustom

### Secondary (MEDIUM confidence)
- Prisma docs on `$queryRaw` with `Prisma.sql` tagged templates — prevents SQL injection
- pg_trgm default similarity threshold of 0.3 — documented in PostgreSQL official docs

### Tertiary (LOW confidence)
- Material Symbols SVG path for "grocery" icon — path value should be verified against current Material Symbols repository before use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — identical to existing project stack, no new libraries
- Architecture: HIGH — directly modeled on recipe CRUD which is fully implemented and working
- API patterns: HIGH — all patterns confirmed by reading actual production code
- pg_trgm search: MEDIUM — pattern derived from Phase 6 decisions + Prisma raw query docs; exact SQL should be tested against live DB
- Nav 5-item fit: MEDIUM — assessed from code inspection, not device testing; recommend testing on 375px viewport

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable stack, no fast-moving dependencies)
