# Mobile Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix mobile touch usability across the meal-planner — always-visible actions, larger touch targets, better picker, sticky search, and auto-scroll to today.

**Architecture:** Tailwind-only changes across 4 files. No new components, no new dependencies. Each task is a self-contained edit to one file.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4

---

### Task 1: Remove maximumScale from viewport config

**Files:**
- Modify: `src/app/layout.tsx:21-26`

**Step 1: Edit viewport config**

Replace the viewport export with:

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};
```

Remove only the `maximumScale: 1` line. Keep everything else.

**Step 2: Verify the app still loads**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: allow pinch-to-zoom by removing maximumScale viewport restriction"
```

---

### Task 2: Always-visible action icons on meal entries

**Files:**
- Modify: `src/components/week-planner.tsx:226-322`

**Step 1: Refactor the meal entry layout**

In the `week-planner.tsx` file, find the meal group div (line ~230). Replace the current layout where action icons are in an absolute overlay with `hidden group-hover:flex`:

Replace this block (the entire `<div key={label} className="group relative ...">` through its closing `</div>`):

```tsx
<div
  key={label}
  className="group relative rounded-md bg-primary/5 p-2"
>
  <p className="text-sm font-medium leading-tight">
    {label}
  </p>
  <div className="mt-0.5 flex flex-wrap gap-1">
    {members.length === familyMembers.length ? (
      <span className="text-xs text-muted">Alle</span>
    ) : (
      members.map((m) => (
        <span
          key={m.forUser.id}
          className="inline-flex items-center rounded bg-card px-1 text-xs text-muted"
        >
          {m.forUser.displayName}
        </span>
      ))
    )}
  </div>
  {/* Edit, Persons, and Delete buttons */}
  <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
```

With this new structure:

```tsx
<div
  key={label}
  className="flex items-start gap-2 rounded-md bg-primary/5 p-2"
>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium leading-tight">
      {label}
    </p>
    <div className="mt-0.5 flex flex-wrap gap-1">
      {members.length === familyMembers.length ? (
        <span className="text-xs text-muted">Alle</span>
      ) : (
        members.map((m) => (
          <span
            key={m.forUser.id}
            className="inline-flex items-center rounded bg-card px-1 text-xs text-muted"
          >
            {m.forUser.displayName}
          </span>
        ))
      )}
    </div>
  </div>
  {/* Edit, Persons, and Delete buttons — always visible */}
  <div className="flex shrink-0 items-center gap-0.5">
```

Also update the three action buttons — remove the `group-hover` classes and keep them simple. The button classes stay the same (`rounded-full p-1.5 text-muted hover:text-primary` etc.) but increase padding from `p-0.5` to `p-1.5` for larger touch targets. Keep the SVG icons at `width="16" height="16"` (slightly larger than the current 14).

Close the action buttons div with `</div>` and then `</div>` for the outer flex container.

**Step 2: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/week-planner.tsx
git commit -m "feat: always-visible action icons on meal entries for touch devices"
```

---

### Task 3: Larger week navigation touch targets

**Files:**
- Modify: `src/components/week-planner.tsx:167-188`

**Step 1: Update week navigation buttons**

Find the week navigation `<div className="mb-4 flex items-center justify-between">` block.

Change the previous-week button from:
```tsx
className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
```
to:
```tsx
className="rounded-lg border border-border p-3 text-sm hover:bg-background"
```

Same change for the next-week button — `px-3 py-1.5` → `p-3`.

**Step 2: Increase the "Gericht wählen" button touch target**

Find the `+ Gericht wählen` button (line ~330). Change `p-2` to `p-3` in its className:

From:
```tsx
className={`flex w-full items-center justify-center rounded-md border border-dashed border-border p-2 text-xs text-muted ...`}
```
To:
```tsx
className={`flex w-full items-center justify-center rounded-md border border-dashed border-border p-3 text-sm text-muted ...`}
```

Also change `text-xs` to `text-sm` for better readability.

**Step 3: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/week-planner.tsx
git commit -m "feat: larger touch targets for week navigation and add-meal buttons"
```

---

### Task 4: Auto-scroll to today on mount

**Files:**
- Modify: `src/components/week-planner.tsx`

**Step 1: Add a ref and useEffect for auto-scrolling**

Add `useRef` to the existing React import (line 3):
```tsx
import { useCallback, useEffect, useRef, useState } from "react";
```

Inside the `WeekPlanner` component, after the state declarations (~line 41), add:
```tsx
const todayRef = useRef<HTMLDivElement>(null);
```

After the `useEffect` that fetches plans (~line 67), add:
```tsx
useEffect(() => {
  if (!loading && todayRef.current) {
    todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, [loading]);
```

**Step 2: Attach the ref to today's card**

Find the day card div (~line 204):
```tsx
<div
  key={dateStr}
  className={`rounded-lg border bg-card p-3 ${
```

Change it to:
```tsx
<div
  key={dateStr}
  ref={today ? todayRef : undefined}
  className={`rounded-lg border bg-card p-3 ${
```

**Step 3: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/week-planner.tsx
git commit -m "feat: auto-scroll to today's card on week planner load"
```

---

### Task 5: Full-height recipe picker modal

**Files:**
- Modify: `src/components/recipe-picker.tsx:380-381`

**Step 1: Increase recipe list height**

Find the recipe list container (line ~381):
```tsx
<div className="max-h-64 overflow-y-auto">
```

Change to:
```tsx
<div className="max-h-[60vh] overflow-y-auto">
```

This gives 60% of viewport height instead of a fixed 256px.

**Step 2: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/recipe-picker.tsx
git commit -m "feat: taller recipe picker list using 60vh instead of fixed 256px"
```

---

### Task 6: Sticky search and filters on recipe list page

**Files:**
- Modify: `src/app/(app)/rezepte/page.tsx:65-103`

**Step 1: Make search + filters sticky**

Find the search & filter container (line ~65):
```tsx
<div className="mb-4 space-y-3">
```

Change to:
```tsx
<div className="sticky top-[49px] z-[5] -mx-4 mb-4 space-y-3 bg-background px-4 pb-3 pt-1">
```

Notes:
- `top-[49px]` — offset for the sticky navbar height (py-3 = 12px*2 + ~25px content = ~49px). Verify visually and adjust if needed.
- `-mx-4 px-4` — extend background to full width to cover content scrolling behind
- `bg-background` — solid background so scrolling content doesn't show through
- `pb-3 pt-1` — vertical padding for visual separation

**Step 2: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(app)/rezepte/page.tsx
git commit -m "feat: sticky search bar and category filters on recipe list page"
```

---

### Task 7: Larger category filter chips

**Files:**
- Modify: `src/app/(app)/rezepte/page.tsx`

**Step 1: Increase chip touch targets**

Find the "Alle" category button and individual category buttons. Change their padding class from `py-1` to `py-1.5`:

For the "Alle" button (~line 78):
```tsx
className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
```

For each category button (~line 92):
```tsx
className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
```

Both already have `px-3`, just change `py-1` to `py-1.5`.

**Step 2: Verify build**

Run: `cd /Users/markuszabel/Development/meal-planner && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(app)/rezepte/page.tsx
git commit -m "feat: larger touch targets for recipe category filter chips"
```
