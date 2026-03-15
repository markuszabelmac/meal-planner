---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/week-planner.tsx
  - src/app/(app)/rezepte/[id]/page.tsx
autonomous: true
requirements: [QUICK-1]
must_haves:
  truths:
    - "Clicking a recipe name in the week planner navigates to the recipe detail page"
    - "Custom meals (non-recipe entries) are not clickable links"
    - "Recipe detail page shows a back link to the week planner when navigated from planner"
    - "User can easily return to the week planner from the recipe detail"
  artifacts:
    - path: "src/components/week-planner.tsx"
      provides: "Clickable recipe name links in meal plan entries"
    - path: "src/app/(app)/rezepte/[id]/page.tsx"
      provides: "Context-aware breadcrumbs with planner back link"
  key_links:
    - from: "src/components/week-planner.tsx"
      to: "/rezepte/[id]"
      via: "Next.js Link with ?from=planner query param"
      pattern: "Link.*href.*rezepte"
---

<objective>
Make recipe names in the week planner clickable links that navigate to the recipe detail page, and provide easy navigation back to the planner.

Purpose: Users want to quickly view a recipe's details (ingredients, instructions) from the week planner and return easily.
Output: Clickable recipe names in week planner + context-aware back navigation on recipe detail page.
</objective>

<execution_context>
@/Users/markuszabel/.claude/get-shit-done/workflows/execute-plan.md
@/Users/markuszabel/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/week-planner.tsx
@src/app/(app)/rezepte/[id]/page.tsx
@src/components/breadcrumbs.tsx
</context>

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/components/week-planner.tsx:
```typescript
type MealPlanEntry = {
  id: string;
  date: string;
  recipeId: string | null;
  customMeal: string | null;
  recipe: { id: string; name: string; category: string | null } | null;
  forUser: { id: string; displayName: string };
  assigner: { displayName: string };
};
```

The `groupEntries` function produces groups with shape:
```typescript
{ label: string; recipe: MealPlanEntry["recipe"]; members: MealPlanEntry[] }
```

The recipe detail page is at `/rezepte/[id]` and uses `<Breadcrumbs>` component.
The week planner (home page) is at `/`.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Make recipe names clickable links in week planner</name>
  <files>src/components/week-planner.tsx</files>
  <action>
In `week-planner.tsx`:

1. Add `import Link from "next/link"` at the top.

2. In the `groups.map()` render block (around line 235-242), change the recipe label `<p>` element to conditionally render a `Link` when the group has a recipe (i.e., `recipe` is not null), and a plain `<p>` for custom meals.

Currently the label is:
```tsx
<p className="text-sm font-medium leading-tight">
  {label}
</p>
```

Change to:
```tsx
{recipe ? (
  <Link
    href={`/rezepte/${recipe.id}?from=planner`}
    className="text-sm font-medium leading-tight text-foreground hover:text-primary hover:underline"
  >
    {label}
  </Link>
) : (
  <p className="text-sm font-medium leading-tight">
    {label}
  </p>
)}
```

The destructured `groups.map(({ label, recipe, members })` already has `recipe` available from the existing code (line 235). The `?from=planner` query parameter tells the recipe detail page where the user came from so it can show appropriate back navigation.

Do NOT change anything else in the component — no other layout, logic, or style changes.
  </action>
  <verify>
    <automated>cd /Users/markuszabel/Development/meal-planner && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Recipe names in the week planner are rendered as Next.js Link components pointing to /rezepte/{id}?from=planner. Custom meals remain plain text. No other behavior changed.</done>
</task>

<task type="auto">
  <name>Task 2: Add context-aware back navigation on recipe detail page</name>
  <files>src/app/(app)/rezepte/[id]/page.tsx</files>
  <action>
In the recipe detail page (`src/app/(app)/rezepte/[id]/page.tsx`):

1. Add `searchParams` to the page props. The page function signature becomes:
```tsx
export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
```

2. Await searchParams: `const { from } = await searchParams;`

3. Update the `<Breadcrumbs>` component to show context-aware navigation. When `from === "planner"`, the first breadcrumb should link back to the planner (root `/`):

```tsx
<Breadcrumbs
  items={
    from === "planner"
      ? [
          { label: "Wochenplan", href: "/" },
          { label: recipe.name },
        ]
      : [
          { label: "Rezepte", href: "/rezepte" },
          { label: recipe.name },
        ]
  }
/>
```

This way:
- When arriving from the planner: breadcrumbs show "Wochenplan / Recipe Name" with Wochenplan linking to `/`
- When arriving from recipes list or directly: breadcrumbs show "Rezepte / Recipe Name" as before (existing behavior preserved)

Do NOT change anything else on the recipe detail page.
  </action>
  <verify>
    <automated>cd /Users/markuszabel/Development/meal-planner && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Recipe detail page shows "Wochenplan" breadcrumb linking to "/" when accessed from planner, and preserves existing "Rezepte" breadcrumb for all other access paths.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Dev server runs without errors: `npm run dev`
3. Manual check: In the week planner, recipe names appear as links. Clicking one navigates to the recipe detail with "Wochenplan" in breadcrumbs. Clicking "Wochenplan" returns to the planner.
</verification>

<success_criteria>
- Recipe names in the week planner are clickable and navigate to `/rezepte/{id}`
- Custom meal entries remain plain text (not clickable)
- Recipe detail page shows "Wochenplan" breadcrumb with back link when accessed from planner
- Recipe detail page shows "Rezepte" breadcrumb when accessed from recipes list (existing behavior unchanged)
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/1-wenn-man-im-wochenplan-auf-ein-rezept-kl/1-SUMMARY.md`
</output>
