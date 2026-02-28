# Wochenplan-Vereinfachung Design

## Zusammenfassung

Drei Änderungen am Wochenplan: ein Essen pro Tag (kein Mittag/Abend), Freitext-Einträge ohne Rezept, und Bearbeiten/Löschen von Einträgen.

## Änderungen

### 1. Ein Essen pro Tag
- `mealType` Spalte aus `MealPlan` entfernen
- Unique Constraint: `(date, forUserId)` statt `(date, mealType, forUserId)`
- UI zeigt pro Tag eine Zeile ohne Mittag/Abend-Unterscheidung

### 2. Freitext + optional Rezept
- `recipeId` in `MealPlan` wird optional (nullable)
- Neues Feld `customMeal` (String, optional) für Freitext wie "Pizza bestellt", "Reste"
- Validierung: entweder `recipeId` ODER `customMeal` muss gesetzt sein
- UI: Beim Hinzufügen kann man Rezept wählen ODER Freitext eintippen

### 3. Bearbeiten/Löschen von Einträgen
- Jeder Eintrag bekommt Edit- und Delete-Buttons
- Edit öffnet Modal zum Ändern von Rezept/Freitext
- Delete entfernt den Eintrag (mit Bestätigung)

## Schema-Änderung (MealPlan)

```prisma
model MealPlan {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  recipeId   String?  @map("recipe_id")        // NOW OPTIONAL
  customMeal String?  @map("custom_meal")       // NEW
  forUserId  String   @map("for_user_id")
  assignedBy String   @map("assigned_by")
  createdAt  DateTime @default(now()) @map("created_at")
  recipe     Recipe?  @relation(fields: [recipeId], references: [id])
  forUser    User     @relation("ForUser", fields: [forUserId], references: [id])
  assigner   User     @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@unique([date, forUserId])
  @@map("meal_plans")
}
```

Entfernt: `mealType` Spalte
Geändert: `recipeId` nullable, unique constraint ohne mealType
Neu: `customMeal` Spalte

## Betroffene Dateien

- `prisma/schema.prisma` — Schema-Änderung + Migration
- `src/app/api/meal-plans/route.ts` — API anpassen (CRUD + Freitext + kein mealType)
- `src/components/week-planner.tsx` — UI vereinfachen (ein Slot pro Tag, Edit/Delete, Freitext-Input)
- `src/components/recipe-picker.tsx` — Optional: Freitext-Option hinzufügen
