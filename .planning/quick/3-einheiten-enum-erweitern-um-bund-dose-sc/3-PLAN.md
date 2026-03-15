---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/lib/units.ts
  - src/components/ingredient-row-editor.tsx
autonomous: true
requirements: [QUICK-3]
must_haves:
  truths:
    - "Unit enum contains bund, dose, scheibe, becher in addition to existing values"
    - "Unit dropdown in recipe ingredient editor shows all 12 unit options with German labels"
    - "unitToGrams returns null for bund/dose/scheibe/becher (item-dependent, no fixed conversion)"
    - "Database migration applies cleanly to existing data"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Unit enum with 12 values"
      contains: "bund"
    - path: "src/lib/units.ts"
      provides: "Unit type and conversion map with all 12 units"
      contains: "becher"
    - path: "src/components/ingredient-row-editor.tsx"
      provides: "UNIT_LABELS map with all 12 German labels"
      contains: "Scheibe"
    - path: "prisma/migrations/"
      provides: "AlterEnum migration adding 4 values"
  key_links:
    - from: "prisma/schema.prisma"
      to: "src/generated/prisma/client"
      via: "prisma generate"
      pattern: "enum Unit"
    - from: "src/lib/units.ts"
      to: "src/lib/nutrition.ts"
      via: "unitToGrams import"
      pattern: "unitToGrams.*as Unit"
---

<objective>
Add four new unit values (bund, dose, scheibe, becher) to the application.

Purpose: Users need these common German cooking units when entering recipe ingredients. Currently only weight/volume/spoon units exist, but recipes frequently call for "1 Bund Petersilie", "1 Dose Tomaten", "2 Scheiben Kaese", "1 Becher Sahne".

Output: Updated Prisma schema with migration, extended unit conversion utility, and updated UI labels.
</objective>

<execution_context>
@/Users/markuszabel/.claude/get-shit-done/workflows/execute-plan.md
@/Users/markuszabel/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma
@src/lib/units.ts
@src/components/ingredient-row-editor.tsx
@src/lib/nutrition.ts

<interfaces>
From src/lib/units.ts:
```typescript
export type Unit = "g" | "kg" | "ml" | "l" | "stueck" | "el" | "tl" | "prise";

export const UNIT_TO_GRAMS: Record<Unit, number | null> = { ... };

export function unitToGrams(amount: number, unit: Unit): number | null;
```

From src/components/ingredient-row-editor.tsx:
```typescript
export const UNIT_LABELS: Record<string, string> = {
  g: "g", kg: "kg", ml: "ml", l: "l",
  stueck: "Stück", el: "EL", tl: "TL", prise: "Prise",
};
```

From src/lib/nutrition.ts (consumer -- no changes needed, uses unitToGrams):
```typescript
const grams = unitToGrams(ri.amount, ri.unit as Unit);
// null case already handled (hasSkippedStueck flag)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add enum values to Prisma schema and run migration</name>
  <files>prisma/schema.prisma</files>
  <action>
Add four new values to the Unit enum in prisma/schema.prisma, after "prise":

```
enum Unit {
  g
  kg
  ml
  l
  stueck
  el
  tl
  prise
  bund
  dose
  scheibe
  becher

  @@map("Unit")
}
```

Then run the Prisma migration:
```bash
npx prisma migrate dev --name add-unit-bund-dose-scheibe-becher
```

This generates an ALTER TYPE migration that adds the 4 values to the PostgreSQL enum. Existing rows are not affected (no column changes, just new allowed values).

After migration completes, verify the generated client is updated:
```bash
npx prisma generate
```
  </action>
  <verify>
    <automated>npx prisma migrate status 2>&1 | grep -q "applied" && echo "OK"</automated>
  </verify>
  <done>Unit enum in database has 12 values. prisma migrate status shows all migrations applied. Generated Prisma client includes new enum values.</done>
</task>

<task type="auto">
  <name>Task 2: Update unit conversion map and UI labels</name>
  <files>src/lib/units.ts, src/components/ingredient-row-editor.tsx</files>
  <action>
**src/lib/units.ts** -- Extend the Unit type and UNIT_TO_GRAMS map:

1. Update the Unit type to include the 4 new values:
```typescript
export type Unit = "g" | "kg" | "ml" | "l" | "stueck" | "el" | "tl" | "prise" | "bund" | "dose" | "scheibe" | "becher";
```

2. Add entries to UNIT_TO_GRAMS -- all four are item-dependent (no fixed gram conversion), same as "stueck":
```typescript
bund: null,     // 1 Bund varies by herb (parsley vs chives)
dose: null,     // 1 Dose varies by product (400g tomatoes vs 200g tuna)
scheibe: null,  // 1 Scheibe varies by item (bread vs cheese)
becher: null,   // 1 Becher varies by product (150g yogurt vs 200g cream)
```

**src/components/ingredient-row-editor.tsx** -- Add German labels to UNIT_LABELS:
```typescript
export const UNIT_LABELS: Record<string, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  stueck: "Stück",
  el: "EL",
  tl: "TL",
  prise: "Prise",
  bund: "Bund",
  dose: "Dose",
  scheibe: "Scheibe",
  becher: "Becher",
};
```

Note: nutrition.ts does NOT need changes -- unitToGrams already returns null for unknown/item-dependent units, and the hasSkippedStueck flag (poorly named but functional) correctly signals that some ingredients could not be converted. The naming can be improved in a future cleanup.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>TypeScript compiles without errors. Unit type has 12 values. UNIT_TO_GRAMS has 12 entries (4 new ones returning null). UNIT_LABELS has 12 entries with German display names.</done>
</task>

</tasks>

<verification>
1. `npx prisma migrate status` -- all migrations applied
2. `npx tsc --noEmit` -- zero type errors
3. `npm run build` -- production build succeeds
4. Open recipe form in browser, click unit dropdown -- all 12 units visible with correct German labels
</verification>

<success_criteria>
- Prisma Unit enum has 12 values (g, kg, ml, l, stueck, el, tl, prise, bund, dose, scheibe, becher)
- Database migration applied successfully
- Unit type in src/lib/units.ts matches Prisma enum
- UNIT_TO_GRAMS has entries for all 12 units (bund/dose/scheibe/becher return null)
- UNIT_LABELS shows German labels for all 12 units
- TypeScript compiles, build passes
</success_criteria>

<output>
After completion, create `.planning/quick/3-einheiten-enum-erweitern-um-bund-dose-sc/3-SUMMARY.md`
</output>
