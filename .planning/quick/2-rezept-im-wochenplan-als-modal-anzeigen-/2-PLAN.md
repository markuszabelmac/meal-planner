---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/recipe-detail-modal.tsx
  - src/components/week-planner.tsx
autonomous: true
must_haves:
  truths:
    - "Clicking a recipe name in the week planner opens a modal overlay with recipe details"
    - "Modal has an X close button in the top right corner"
    - "Modal shows recipe name, image, category, prep time, servings, tags, ingredients, instructions, and source link"
    - "No page navigation occurs when clicking a recipe in the planner"
  artifacts:
    - path: "src/components/recipe-detail-modal.tsx"
      provides: "Recipe detail modal component"
    - path: "src/components/week-planner.tsx"
      provides: "Week planner with modal integration instead of Link navigation"
  key_links:
    - from: "src/components/week-planner.tsx"
      to: "src/components/recipe-detail-modal.tsx"
      via: "selectedRecipeId state + RecipeDetailModal component"
    - from: "src/components/recipe-detail-modal.tsx"
      to: "/api/recipes/[id]"
      via: "fetch on mount when recipeId provided"
---

<objective>
Replace Link-based recipe navigation in the week planner with a modal overlay that shows full recipe details inline. Clicking a recipe name opens a modal with an X close button (top right), fetching recipe data from `/api/recipes/{id}`.

Purpose: Better UX — users stay in the planner context instead of navigating away and needing to navigate back.
Output: New RecipeDetailModal component, updated WeekPlanner integration.
</objective>

<execution_context>
@/Users/markuszabel/.claude/get-shit-done/workflows/execute-plan.md
@/Users/markuszabel/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/week-planner.tsx
@src/components/recipe-picker.tsx (reference for overlay pattern: fixed inset-0 z-50)
@src/app/(app)/rezepte/[id]/page.tsx (reference for what data to display)
@src/app/api/recipes/[id]/route.ts (GET endpoint returns full recipe with creator)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create RecipeDetailModal component</name>
  <files>src/components/recipe-detail-modal.tsx</files>
  <action>
Create a new client component `RecipeDetailModal` that displays recipe details in a modal overlay.

Props: `{ recipeId: string; onClose: () => void }`

Implementation:
- Use the same overlay pattern as RecipePicker: `fixed inset-0 z-50` with a semi-transparent backdrop (`bg-black/50`). Clicking the backdrop calls onClose.
- On mount, fetch recipe data from `/api/recipes/${recipeId}`, store in state. Show a loading spinner/text while fetching.
- Modal content panel: white/card background, rounded-lg, max-w-lg, max-h-[90vh] with overflow-y-auto, centered on screen. On mobile: full-width with small margin (mx-4).
- X close button: absolute positioned top-right of the modal panel (top-3 right-3), using an SVG X icon (24x24), rounded-full, p-1, hover:bg-background.
- Display the same data as the recipe detail page (`src/app/(app)/rezepte/[id]/page.tsx`):
  - Recipe name as h2 (text-xl font-bold)
  - Creator name below (text-sm text-muted, "von {displayName}")
  - Image if present (aspect-video, rounded-lg, object-cover, using next/image with unoptimized)
  - Meta badges: category (primary colored pill), prepTime ("X Min."), servings ("X Portionen")
  - Tags as small pills
  - Source URL as external link with icon
  - Description section with "Beschreibung" heading
  - Ingredients section with "Zutaten" heading (split by newline, join with comma — same as detail page)
  - Instructions section with "Zubereitung" heading (whitespace-pre-line)
- All section labels in German matching the detail page.
- Add a "Zum Rezept" link at the bottom that navigates to `/rezepte/${recipeId}` for users who want the full page (text-sm text-primary, centered).
- Close on Escape key (useEffect with keydown listener).
- Prevent body scroll when modal is open (set document.body.style.overflow = 'hidden' on mount, restore on unmount).
  </action>
  <verify>
    <automated>npx tsc --noEmit --strict src/components/recipe-detail-modal.tsx 2>&1 | head -20</automated>
  </verify>
  <done>RecipeDetailModal component exists, accepts recipeId and onClose props, renders recipe details in a modal overlay with X close button.</done>
</task>

<task type="auto">
  <name>Task 2: Integrate modal into WeekPlanner, replace Link navigation</name>
  <files>src/components/week-planner.tsx</files>
  <action>
Modify week-planner.tsx to use RecipeDetailModal instead of Link navigation:

1. Remove the `import Link from "next/link"` import (no longer needed in this file).
2. Add `import { RecipeDetailModal } from "./recipe-detail-modal"`.
3. Add state: `const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null)`.
4. In the render where recipe names are shown (around line 243-248), replace the `<Link href={/rezepte/${recipe.id}?from=planner}>` with a `<button>` that calls `setViewingRecipeId(recipe.id)`. Style the button identically: `text-sm font-medium leading-tight text-foreground hover:text-primary hover:underline text-left` (add text-left since it is now a button, not a link).
5. At the bottom of the component (after the RecipePicker conditional render), add:
   ```
   {viewingRecipeId && (
     <RecipeDetailModal
       recipeId={viewingRecipeId}
       onClose={() => setViewingRecipeId(null)}
     />
   )}
   ```
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Clicking a recipe name in the week planner opens the RecipeDetailModal instead of navigating away. No Link import remains in week-planner.tsx. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- Open the week planner in the browser
- Click on any recipe name in a meal plan entry
- Modal overlay appears with recipe details and X close button in top right
- Clicking X or backdrop or pressing Escape closes the modal
- No page navigation occurs
- "Zum Rezept" link at bottom of modal navigates to full recipe page
- TypeScript compiles cleanly: `npx tsc --noEmit`
</verification>

<success_criteria>
- Recipe names in week planner open a modal overlay instead of navigating to recipe page
- Modal displays full recipe details (name, image, meta, ingredients, instructions)
- Modal has X close button top-right, closes on backdrop click and Escape key
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/2-rezept-im-wochenplan-als-modal-anzeigen-/2-SUMMARY.md`
</output>
