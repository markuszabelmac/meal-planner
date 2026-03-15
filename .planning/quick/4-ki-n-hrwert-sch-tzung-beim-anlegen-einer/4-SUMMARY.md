---
phase: quick-4
plan: "01"
subsystem: ingredients
tags: [ai, nutrition, openai, ingredient-form]
dependency_graph:
  requires: []
  provides: [POST /api/ingredients/estimate-nutrition]
  affects: [src/components/ingredient-form.tsx]
tech_stack:
  added: []
  patterns: [gpt-4o-mini json_object mode, existing auth+OpenAI pattern]
key_files:
  created:
    - src/app/api/ingredients/estimate-nutrition/route.ts
  modified:
    - src/components/ingredient-form.tsx
decisions:
  - "Use existing suggest route pattern for auth/key checks to stay consistent"
  - "Validate all 7 fields are numeric on API side before returning to prevent partial fills"
  - "Client-side name check before API call to avoid unnecessary requests"
metrics:
  duration: "1 minute"
  completed: "2026-03-15"
---

# Quick Task 4: KI-Naehrwert-Schaetzung Summary

**One-liner:** GPT-4o-mini nutrition estimation via POST endpoint with auto-fill button in ingredient form, using same auth/OpenAI pattern as existing suggest route.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create nutrition estimation API route | 68ad691 | src/app/api/ingredients/estimate-nutrition/route.ts |
| 2 | Add estimate button to ingredient form | b53e824 | src/components/ingredient-form.tsx |

## What Was Built

### POST /api/ingredients/estimate-nutrition

New API route that:
- Requires authentication (401 if not logged in)
- Guards against missing OPENAI_API_KEY (503 with German error message)
- Validates request body has non-empty `name` string (400 if missing)
- Calls GPT-4o-mini with `response_format: { type: "json_object" }` and max_tokens: 500
- System prompt instructs model to return all 7 nutrition fields as numbers per 100g
- Validates all 7 fields are present and numeric before returning
- Returns: kcalPer100g, proteinPer100g, fatPer100g, satFatPer100g, carbsPer100g, sugarPer100g, fiberPer100g

### Ingredient Form Changes

- Added `estimating` and `estimateError` state (separate from form submit `loading`/`error`)
- Added `handleEstimate` async function with client-side empty-name guard
- Estimate button placed in flex header row next to "Naehrwerte pro 100g" heading
- Button disabled when name is empty or estimation is in progress
- Success: all 7 setters called with `String(value)` from API response
- Error: shown in red box below the button row at text-xs size

## Verification

- TypeScript: `npx tsc --noEmit` passes with no user-code errors
- Manual: Navigate to /zutaten/neu, enter ingredient name, click "Naehrwerte schaetzen" — all 7 fields populate

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] src/app/api/ingredients/estimate-nutrition/route.ts exists
- [x] src/components/ingredient-form.tsx modified
- [x] Commit 68ad691 exists (Task 1)
- [x] Commit b53e824 exists (Task 2)
- [x] TypeScript compiles without user-code errors
