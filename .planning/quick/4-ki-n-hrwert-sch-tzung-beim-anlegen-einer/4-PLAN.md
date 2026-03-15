---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/ingredients/estimate-nutrition/route.ts
  - src/components/ingredient-form.tsx
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "User sees a 'Naehrwerte schaetzen' button in the ingredient form when creating or editing"
    - "Clicking the button with a name entered calls GPT-4o-mini and fills all 7 nutrition fields"
    - "Loading state is visible while the API call is in progress"
    - "Error is shown if estimation fails or name is empty"
  artifacts:
    - path: "src/app/api/ingredients/estimate-nutrition/route.ts"
      provides: "POST endpoint for AI nutrition estimation"
      exports: ["POST"]
    - path: "src/components/ingredient-form.tsx"
      provides: "Estimate button and fetch logic"
  key_links:
    - from: "src/components/ingredient-form.tsx"
      to: "/api/ingredients/estimate-nutrition"
      via: "fetch POST with { name }"
      pattern: "fetch.*estimate-nutrition"
---

<objective>
Add AI-powered nutrition estimation to the ingredient form. A "Naehrwerte schaetzen" button calls GPT-4o-mini to estimate 7 nutrition values per 100g for a given ingredient name and fills the form fields automatically.

Purpose: Saves users from manually looking up nutrition data for every new ingredient.
Output: Working API route + button in ingredient form.
</objective>

<execution_context>
@/Users/markuszabel/.claude/get-shit-done/workflows/execute-plan.md
@/Users/markuszabel/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ingredient-form.tsx
@src/app/api/ai/suggest/route.ts
@src/lib/auth.ts
</context>

<interfaces>
<!-- Existing OpenAI pattern from src/app/api/ai/suggest/route.ts -->
```typescript
import OpenAI from "openai";
// Instantiate: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// Auth check: const session = await auth(); if (!session?.user?.id) return 401
// Missing key check: if (!process.env.OPENAI_API_KEY) return 503
// Model: "gpt-4o-mini"
// JSON mode: response_format: { type: "json_object" }
```

<!-- Ingredient form state setters (all exist, all take string) -->
```typescript
setKcalPer100g(val: string)
setProteinPer100g(val: string)
setFatPer100g(val: string)
setSatFatPer100g(val: string)
setCarbsPer100g(val: string)
setSugarPer100g(val: string)
setFiberPer100g(val: string)
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Create nutrition estimation API route</name>
  <files>src/app/api/ingredients/estimate-nutrition/route.ts</files>
  <action>
Create POST /api/ingredients/estimate-nutrition route following the exact pattern from src/app/api/ai/suggest/route.ts:

1. Auth check using `auth()` from `@/lib/auth` — return 401 if not authenticated
2. Check `process.env.OPENAI_API_KEY` — return 503 with German error message if missing
3. Parse request body: `{ name: string }` — return 400 if name is empty/missing
4. Call GPT-4o-mini with `response_format: { type: "json_object" }` and max_tokens: 500
5. System prompt (German): "Du bist ein Ernaehrungsexperte. Schaetze die Naehrwerte pro 100g fuer die angegebene Zutat. Antworte als JSON mit diesen Feldern: kcalPer100g (number), proteinPer100g (number), fatPer100g (number), satFatPer100g (number), carbsPer100g (number), sugarPer100g (number), fiberPer100g (number). Alle Werte in Gramm ausser kcal. Gib realistische Durchschnittswerte."
6. User message: the ingredient name
7. Parse the JSON response, validate all 7 fields are present and numeric
8. Return the 7 fields as JSON. On OpenAI error, return 500 with German error message.

Use the same error handling pattern as the suggest route (try/catch, error instanceof Error check).
  </action>
  <verify>
    <automated>npx tsc --noEmit src/app/api/ingredients/estimate-nutrition/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>POST /api/ingredients/estimate-nutrition accepts { name }, calls GPT-4o-mini, returns 7 nutrition values as JSON</done>
</task>

<task type="auto">
  <name>Task 2: Add estimate button to ingredient form</name>
  <files>src/components/ingredient-form.tsx</files>
  <action>
Modify the existing IngredientForm component:

1. Add `estimating` boolean state (separate from existing `loading` which is for form submit)
2. Add `estimateError` string state for estimation-specific errors
3. Create `handleEstimate` async function:
   - If `name` is empty, set estimateError to "Bitte zuerst einen Namen eingeben"
   - Set estimating=true, clear estimateError
   - POST to `/api/ingredients/estimate-nutrition` with `{ name }`
   - On success: parse JSON, call all 7 setters with String(value) — e.g. `setKcalPer100g(String(data.kcalPer100g))`
   - On error: set estimateError from response or generic message
   - Finally: set estimating=false

4. Add the button in the "Naehrwerte pro 100g" section header area. Place it next to the h3 heading by wrapping both in a flex container:
   ```
   <div className="mb-3 flex items-center justify-between">
     <h3 className="text-sm font-semibold text-muted">Naehrwerte pro 100g</h3>
     <button type="button" onClick={handleEstimate} disabled={estimating || !name.trim()} ...>
       {estimating ? "Schaetzt..." : "Naehrwerte schaetzen"}
     </button>
   </div>
   ```
   Style the button: `text-xs rounded-md bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors`

5. Show estimateError below the button row if set (same style as existing error div but text-xs)
  </action>
  <verify>
    <automated>npx tsc --noEmit src/components/ingredient-form.tsx 2>&1 | head -20</automated>
  </verify>
  <done>Ingredient form shows "Naehrwerte schaetzen" button next to nutrition section header. Clicking it with a name filled in calls the API and populates all 7 nutrition fields. Button is disabled while estimating or when name is empty. Errors display below the button.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Dev server runs: `npm run dev` — no console errors
3. Manual: Navigate to /zutaten/neu, enter "Haferflocken", click "Naehrwerte schaetzen" — all 7 fields populate with reasonable values
</verification>

<success_criteria>
- API route exists at /api/ingredients/estimate-nutrition and returns 7 nutrition values for a given ingredient name
- Ingredient form has a "Naehrwerte schaetzen" button that fills all nutrition fields via AI
- Loading state shown during estimation, errors displayed on failure
- Button disabled when name field is empty
</success_criteria>

<output>
After completion, create `.planning/quick/4-ki-n-hrwert-sch-tzung-beim-anlegen-einer/4-SUMMARY.md`
</output>
