---
phase: quick-2
plan: "01"
subsystem: week-planner
tags: [modal, ux, recipe-detail, week-planner]
dependency_graph:
  requires: []
  provides: [recipe-detail-modal]
  affects: [week-planner]
tech_stack:
  added: []
  patterns: [modal-overlay, fetch-on-mount, escape-key-handler, body-scroll-lock]
key_files:
  created:
    - src/components/recipe-detail-modal.tsx
  modified:
    - src/components/week-planner.tsx
decisions:
  - "Use fixed inset-0 z-50 overlay pattern consistent with RecipePicker"
  - "Fetch recipe via /api/recipes/[id] on modal mount rather than passing data as props"
  - "Add 'Zum Rezept' link for users who want full page details"
metrics:
  duration: "~2 min"
  completed: "2026-03-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Quick Task 2: Rezept im Wochenplan als Modal anzeigen — Summary

**One-liner:** Recipe detail modal with fetch-on-mount, Escape/backdrop close, body scroll lock, and full recipe display matching the detail page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create RecipeDetailModal component | 9a1c7f1 | src/components/recipe-detail-modal.tsx |
| 2 | Integrate modal into WeekPlanner, replace Link navigation | b53a66e | src/components/week-planner.tsx |

## What Was Built

### RecipeDetailModal (`src/components/recipe-detail-modal.tsx`)

New client component that:
- Accepts `{ recipeId: string; onClose: () => void }` props
- Fetches recipe data from `/api/recipes/${recipeId}` on mount with loading/error states
- Renders a `fixed inset-0 z-50` overlay with semi-transparent backdrop (`bg-black/50`)
- Clicking the backdrop calls `onClose`
- X close button absolutely positioned top-right of the modal panel
- Closes on Escape key via `keydown` event listener
- Locks body scroll on mount, restores on unmount
- Displays: name (h2), creator ("von {displayName}"), image (aspect-video, next/image unoptimized), category badge, prepTime, servings, tags, source URL with external icon, description, ingredients (newline-split joined with comma), instructions (whitespace-pre-line)
- "Zum Rezept" link at the bottom for full page navigation

### WeekPlanner integration (`src/components/week-planner.tsx`)

- Removed `import Link from "next/link"`
- Added `import { RecipeDetailModal } from "./recipe-detail-modal"`
- Added `viewingRecipeId` state (`string | null`)
- Replaced `<Link href={/rezepte/${recipe.id}?from=planner}>` with `<button onClick={() => setViewingRecipeId(recipe.id)}>` with identical styling plus `text-left`
- Added `{viewingRecipeId && <RecipeDetailModal ... />}` after the RecipePicker render

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- recipe-detail-modal.tsx: FOUND
- week-planner.tsx: modified with modal integration
- Commit 9a1c7f1: FOUND (Task 1)
- Commit b53a66e: FOUND (Task 2)
- TypeScript: compiles cleanly (npx tsc --noEmit, no output)
