# Mobile Polish Design

## Goal

Improve the mobile touch experience across the meal-planner app. Focus on fixing real usability issues — hover-dependent actions, small touch targets, cramped modals, and accessibility.

## Approach

Targeted touch fixes (Approach A) — fix specific mobile pain points without restructuring layouts.

## Changes

### 1. Always-Visible Action Icons

**File:** `src/components/week-planner.tsx`

Current: Edit/persons/delete buttons use `hidden group-hover:flex` — invisible on touch.

Change: Replace absolute-positioned hover overlay with always-visible inline icons. Meal entry becomes a flex row with name+chips on left, muted action icons on right.

### 2. Larger Touch Targets

**Files:** `week-planner.tsx`, `rezepte/page.tsx`

- Week nav arrows: `px-3 py-1.5` → `p-3` (44px minimum)
- Meal entry action icons: wrap in `p-2` tap areas (icons 16px, tap area ~40px)
- Category filter chips: `py-1` → `py-1.5`
- "Gericht wählen" button: `p-2` → `p-3`

### 3. Full-Screen Recipe Picker

**File:** `src/components/recipe-picker.tsx`

- Recipe list: `max-h-64` (256px) → `max-h-[60vh]`
- Gives ~60% of screen to browse recipes instead of a tiny scroll area

### 4. Sticky Search on Recipe List

**File:** `src/app/(app)/rezepte/page.tsx`

- Make search input + category filters sticky below navbar
- `sticky top-[57px] z-[5] bg-background` with bottom padding

### 5. Better Week Navigation

**File:** `src/components/week-planner.tsx`

- Increase week nav button padding to `p-3`
- Larger arrow SVGs for easier tapping

### 6. Viewport & Accessibility

**File:** `src/app/layout.tsx`

- Remove `maximumScale: 1` from viewport config
- Allows pinch-to-zoom (accessibility requirement)

### 7. Auto-scroll to Today

**File:** `src/components/week-planner.tsx`

- Add ref to today's day card
- `useEffect` with `scrollIntoView({ behavior: 'smooth', block: 'center' })` on mount
