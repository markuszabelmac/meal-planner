---
phase: 08-structured-ingredient-entry-nutrition-display
plan: "02"
subsystem: recipe-form
tags: [recipe-form, autocomplete, ingredients, ui, structured-ingredients]
dependency_graph:
  requires: [recipe-api-recipeingredients, edit-page-recipeingredients]
  provides: [structured-ingredient-editor]
  affects: [recipe-create-page, recipe-edit-page, nutrition-display]
tech_stack:
  added: []
  patterns: [controlled-autocomplete, request-id-deduplication, onmousedown-blur-fix, uuid-stable-keys]
key_files:
  created:
    - src/components/ingredient-row-editor.tsx
  modified:
    - src/components/recipe-form.tsx
decisions:
  - "Extract IngredientRowEditor to ingredient-row-editor.tsx when recipe-form.tsx exceeded 550 lines — keeps each file focused and readable"
  - "Use requestId counter (useRef) per row to discard stale autocomplete responses — avoids race condition when user types fast"
  - "Use onMouseDown on suggestion items, not onClick — prevents input blur from hiding dropdown before click registers"
  - "150ms setTimeout on input blur to close dropdown — gives onMouseDown time to fire first"
  - "Amount stored as string in state, only parseFloat on submit — avoids controlled input NaN issues"
  - "Filter rows without ingredientId or non-positive amount on submit — sends only valid structured rows to API"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-15"
  tasks_completed: 1
  files_modified: 2
---

# Phase 08 Plan 02: Structured ingredient editor with autocomplete, amount, and unit per row Summary

Structured ingredient editor added to RecipeForm — dynamic rows with fuzzy autocomplete from ingredient DB, amount input, and unit dropdown, submitting recipeIngredients to the API and pre-populating on edit.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add structured ingredient editor to RecipeForm | 1d6f17b | src/components/recipe-form.tsx, src/components/ingredient-row-editor.tsx |

## What Was Built

- **RecipeForm** now renders a "Strukturierte Zutaten" section before the freetext textarea, with a dynamic list of `IngredientRowEditor` rows.
- Each row has a text input with live autocomplete (fetches `/api/ingredients?search=` on >= 2 chars), a decimal amount input (`type="text" inputMode="decimal"` for mobile), and a unit dropdown (g/kg/ml/l/Stück/EL/TL/Prise).
- Autocomplete uses a per-row `requestId` counter (via `useRef`) to discard stale responses when the user types quickly.
- Suggestion selection uses `onMouseDown` (not `onClick`) to survive input blur before the click registers; blur itself is delayed 150ms so mousedown fires first.
- Escape key closes the dropdown without losing focus.
- Rows are keyed by stable `crypto.randomUUID()` IDs; never array index.
- On submit, rows missing `ingredientId` or with non-positive amount are filtered out; valid rows are sent as `{ ingredientId, amount: number, unit }` in the `recipeIngredients` array.
- Editing an existing recipe pre-populates rows from `initial.recipeIngredients`.
- Freetext "Zutaten" textarea is preserved unchanged, renamed to "Zutaten (Freitext)" to distinguish.
- `IngredientRowEditor` extracted to `src/components/ingredient-row-editor.tsx` to keep `recipe-form.tsx` under 550 lines (509 lines final).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted IngredientRowEditor to prevent file size violation**
- **Found during:** Task 1
- **Issue:** Initial monolithic implementation of recipe-form.tsx reached 585 lines, exceeding the 550-line threshold specified in the plan
- **Fix:** Extracted `IngredientRowEditor` component, `IngredientRowState` type, and `UNIT_LABELS` constant into `src/components/ingredient-row-editor.tsx`; recipe-form.tsx imports from there
- **Files modified:** src/components/ingredient-row-editor.tsx (created), src/components/recipe-form.tsx
- **Commit:** 1d6f17b

## Self-Check: PASSED
