---
phase: 08-structured-ingredient-entry-nutrition-display
plan: "01"
subsystem: recipe-api
tags: [api, prisma, recipe, ingredients, nutrition]
dependency_graph:
  requires: []
  provides: [recipe-api-recipeingredients, edit-page-recipeingredients]
  affects: [recipe-form, nutrition-display]
tech_stack:
  added: []
  patterns: [prisma-transaction, nested-create, unit-enum-cast]
key_files:
  created: []
  modified:
    - src/app/api/recipes/route.ts
    - src/app/api/recipes/[id]/route.ts
    - src/app/(app)/rezepte/[id]/bearbeiten/page.tsx
    - src/components/recipe-form.tsx
decisions:
  - "Cast unit string to Unit enum at API boundary rather than validating against enum values — type-safe without runtime overhead; invalid values will be rejected by DB constraint"
  - "Destructure transaction result as [, recipe] (skip index 0 BatchPayload) — correct way to get recipe.update result from $transaction array"
  - "Export RecipeData and RecipeIngredientFormData types from recipe-form.tsx to avoid duplication when Plan 02 extends the form"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-15"
  tasks_completed: 2
  files_modified: 4
---

# Phase 08 Plan 01: Recipe API recipeIngredients data layer Summary

Extended POST/PUT/GET recipe endpoints to persist and return structured ingredient rows, and updated the edit page to load existing recipeIngredients for round-trip editing.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend recipe API routes to handle recipeIngredients | b7ba6d2 | src/app/api/recipes/route.ts, src/app/api/recipes/[id]/route.ts |
| 2 | Extend edit page to load and pass recipeIngredients | d9d4b39 | src/app/(app)/rezepte/[id]/bearbeiten/page.tsx, src/components/recipe-form.tsx |

## What Was Built

- **POST /api/recipes** now accepts an optional `recipeIngredients` array and persists valid rows via nested Prisma create. Response includes full `recipeIngredients` with nested ingredient nutrition fields.
- **GET /api/recipes/[id]** now includes `recipeIngredients` with nested ingredient data (`kcalPer100g`, `proteinPer100g`, `fatPer100g`, `carbsPer100g`) ordered by `createdAt`.
- **PUT /api/recipes/[id]** when `recipeIngredients` is provided in the body, wraps a `deleteMany` + `recipe.update` in a `$transaction` for atomic replacement. When the field is absent, updates only recipe fields (backward compatible).
- **Edit page** now queries `recipeIngredients` from DB and passes them to `RecipeForm` as `initial.recipeIngredients`, mapped to form shape (`amount` as string, `ingredientName` from nested ingredient).
- **RecipeForm** type extended with optional `recipeIngredients: RecipeIngredientFormData[]` field; both `RecipeData` and `RecipeIngredientFormData` are now exported for Plan 02 use.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed $transaction destructuring index**
- **Found during:** Task 1
- **Issue:** `[recipe] = await prisma.$transaction([deleteMany, update])` would assign index 0 (the `BatchPayload` from `deleteMany`) to `recipe`, not the updated Recipe
- **Fix:** Changed to `[, recipe] = await prisma.$transaction([...])` to skip index 0 and capture index 1
- **Files modified:** src/app/api/recipes/[id]/route.ts
- **Commit:** b7ba6d2

**2. [Rule 3 - Blocking] Added Unit enum cast for Prisma type safety**
- **Found during:** Task 1
- **Issue:** `unit: string` is not assignable to Prisma's `Unit` enum type — TypeScript rejected the recipeIngredients create payloads
- **Fix:** Import `Unit` from `@/generated/prisma/client` and cast `row.unit as Unit` in both POST and PUT handlers
- **Files modified:** src/app/api/recipes/route.ts, src/app/api/recipes/[id]/route.ts
- **Commit:** b7ba6d2

**3. [Rule 3 - Blocking] Added recipeIngredients field to RecipeData type**
- **Found during:** Task 2
- **Issue:** Passing `recipeIngredients` in the `initial` prop to `RecipeForm` would cause a TypeScript error since `RecipeData` had no such field
- **Fix:** Added optional `recipeIngredients?: RecipeIngredientFormData[]` to `RecipeData` type in recipe-form.tsx; also exported the types for Plan 02 consumption
- **Files modified:** src/components/recipe-form.tsx
- **Commit:** d9d4b39

## Self-Check: PASSED

All 4 modified files exist. Both task commits (b7ba6d2, d9d4b39) verified in git log.
