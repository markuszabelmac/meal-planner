---
phase: 07-ingredient-admin-ui
plan: 01
subsystem: api, ui
tags: [prisma, postgresql, pg_trgm, nextjs, tailwind, react]

# Dependency graph
requires:
  - phase: 06-schema-data-foundation
    provides: Ingredient model in Prisma schema with pg_trgm fuzzy search capability
provides:
  - GET/POST /api/ingredients endpoints with fuzzy search and custom ingredient creation
  - PUT/DELETE /api/ingredients/[id] endpoints with USDA guard
  - IngredientForm component for create and edit modes
  - DeleteIngredientButton component with two-step confirmation
  - GroceryIcon and 5th "Zutaten" nav item in NavBar
affects: [07-02-ingredient-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pg_trgm $queryRaw pattern for fuzzy ingredient search (mirrors units.ts approach)
    - Auth guard + validation pattern from recipe API routes applied to ingredient routes
    - Two-step delete confirmation component pattern (mirrors delete-recipe-button.tsx)
    - isCustom guard: DELETE returns 403 for USDA entries, null render for delete button

key-files:
  created:
    - src/app/api/ingredients/route.ts
    - src/app/api/ingredients/[id]/route.ts
    - src/components/ingredient-form.tsx
    - src/components/delete-ingredient-button.tsx
  modified:
    - src/components/icons.tsx
    - src/components/nav-bar.tsx

key-decisions:
  - "Import path for Prisma namespace is @/generated/prisma/client (not @/generated/prisma) — matches how meal-plans/route.ts imports MealType"
  - "DELETE returns { success: true, detachedRecipes: count } so callers can surface warning if recipes lose structured ingredient link"
  - "IngredientForm redirects to /zutaten on success (not back to the ingredient detail) to keep create/edit flow simple before detail pages exist"

patterns-established:
  - "Ingredient API follows recipe API pattern exactly: auth check, NextResponse.json, same error message format"
  - "GroceryIcon uses Material Symbols egg_alt path, same defaultProps spread as other icons"

requirements-completed: [VIEW-05]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 7 Plan 1: Ingredient Admin UI — API Routes and Shared Components Summary

**Four ingredient CRUD endpoints with pg_trgm fuzzy search, plus IngredientForm, DeleteIngredientButton, GroceryIcon, and 5th Zutaten nav item**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T19:29:30Z
- **Completed:** 2026-03-15T19:32:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- GET /api/ingredients returns up to 100 results ordered custom-first then alphabetically; triggers pg_trgm fuzzy search via $queryRaw when query >= 2 chars
- POST /api/ingredients creates custom ingredients (isCustom always true), PUT updates, DELETE guards USDA entries with 403
- IngredientForm handles create and edit with full nutrition field set; DeleteIngredientButton renders only for isCustom=true with two-step confirmation
- NavBar updated to 5 items with new GroceryIcon pointing to /zutaten

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ingredient API routes** - `7a5c38d` (feat)
2. **Task 2: Add nav icon and shared components** - `dae2809` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/ingredients/route.ts` - GET (list/fuzzy search) and POST (create custom) endpoints
- `src/app/api/ingredients/[id]/route.ts` - PUT (update) and DELETE (guard non-custom) endpoints
- `src/components/ingredient-form.tsx` - Shared create/edit form with all nutrition fields
- `src/components/delete-ingredient-button.tsx` - Two-step delete, null render for USDA entries
- `src/components/icons.tsx` - Added GroceryIcon (Material Symbols egg_alt)
- `src/components/nav-bar.tsx` - Added 5th Zutaten nav item with GroceryIcon

## Decisions Made

- Import path for the `Prisma` namespace is `@/generated/prisma/client` (not `@/generated/prisma`) — discovered when Turbopack build failed on initial route; aligned with how `meal-plans/route.ts` imports `MealType`.
- DELETE returns `{ success: true, detachedRecipes: count }` so callers can surface a warning if recipes lose their structured ingredient link (schema uses onDelete: SetNull so deletion is safe).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma import path**
- **Found during:** Task 1 (Create ingredient API routes)
- **Issue:** Import `{ Prisma } from "@/generated/prisma"` failed at build — Turbopack could not resolve the bare directory path
- **Fix:** Changed import to `@/generated/prisma/client` matching the pattern used in `meal-plans/route.ts`
- **Files modified:** src/app/api/ingredients/route.ts
- **Verification:** `npx next build` passed cleanly after fix
- **Committed in:** `7a5c38d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking import path)
**Impact on plan:** Required correction, no scope change.

## Issues Encountered

The plan referenced `@/generated/prisma` as the import path for the `Prisma` namespace but the actual generated Prisma client directory does not export it at the root — the correct subpath is `/client`. Resolved immediately by inspection of existing routes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 API endpoints available and build-verified; Plan 02 can scaffold ingredient pages against these contracts
- IngredientForm and DeleteIngredientButton ready to drop into new and edit page routes
- /zutaten route path established in nav but the page itself will be built in Plan 02

---
*Phase: 07-ingredient-admin-ui*
*Completed: 2026-03-15*
