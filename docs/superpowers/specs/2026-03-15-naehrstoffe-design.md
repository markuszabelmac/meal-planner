# Nährstoffe Feature Design

**Datum:** 2026-03-15
**Status:** Approved

## Ziel

Nährstoffberechnung pro Rezept basierend auf strukturierten Zutaten mit lokaler Zutatendatenbank. Persönliche Nährwert-Historie basierend auf Wochenplan.

## Datenmodell

### Neue Tabelle: `Ingredient` (Zutatendatenbank)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | String (PK) | |
| name | String | z.B. "Hackfleisch" |
| category | String? | z.B. "Fleisch", "Gemüse" |
| caloriesPer100g | Float | kcal |
| proteinPer100g | Float | g |
| fatPer100g | Float | g |
| saturatedFatPer100g | Float | g |
| carbsPer100g | Float | g |
| sugarPer100g | Float | g |
| fiberPer100g | Float | g |
| createdBy | String (FK) | User |

Initial befüllt aus öffentlicher Quelle (USDA FoodData Central).

### Neue Tabelle: `RecipeIngredient` (Verknüpfung)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | String (PK) | |
| recipeId | String (FK) | Recipe |
| ingredientId | String? (FK) | Ingredient (null wenn kein Match) |
| name | String | Freitext-Name der Zutat |
| amount | Float | Menge |
| unit | String | Einheit (g, ml, Stück, etc.) |
| caloriesEstimated | Float? | KI-Schätzung wenn kein DB-Match |
| proteinEstimated | Float? | KI-Schätzung |
| fatEstimated | Float? | KI-Schätzung |
| saturatedFatEstimated | Float? | KI-Schätzung |
| carbsEstimated | Float? | KI-Schätzung |
| sugarEstimated | Float? | KI-Schätzung |
| fiberEstimated | Float? | KI-Schätzung |

Nährwerte pro Portion = Summe aller RecipeIngredients / recipe.servings.
Wenn ingredientId gesetzt: Nährwerte aus Ingredient-Tabelle berechnen (amount * nutrient / 100).
Wenn nicht: geschätzte Werte verwenden.

### Bestehendes Modell: `Recipe`

Freitext-Feld `ingredients` bleibt als Fallback/Anzeige erhalten.

## Prozesse

### URL-Import

1. KI extrahiert Zutaten strukturiert: `{name, amount, unit}`
2. System matcht gegen Ingredient-Tabelle (fuzzy name match)
3. Gutes Match → ingredientId verknüpft
4. Kein Match → KI schätzt Nährwerte → in estimated-Feldern gespeichert
5. RecipeIngredient-Zeilen werden erstellt

### Manuelle Eingabe

1. User tippt Zutatname → Autocomplete/Suche in Ingredient-Tabelle
2. User wählt Zutat, gibt Menge + Einheit ein
3. Nährwerte sofort sichtbar (aus DB berechnet)
4. Alternativ: Freitext-Zutat ohne DB-Match möglich

### KI-Inspiration (Save Recipe)

Gleicher Prozess wie URL-Import — KI liefert strukturiert, System matcht.

## Neue Ansichten

### Rezeptdetailseite: Nährwert-Tabelle

- Position: Unter den Zutaten
- Zeigt Nährwerte **pro Portion**
- Felder: Kalorien, Protein, Fett, gesättigte Fettsäuren, Kohlenhydrate, Zucker, Ballaststoffe
- Nur angezeigt wenn RecipeIngredients vorhanden

### Neuer Menüpunkt: "Meine Nährwerte"

- **Tagesansicht**: Aufschlüsselung pro Mahlzeit + Tagessumme
- **Wochenansicht**: Tageswerte als Übersicht + Wochendurchschnitt
- Umschaltbar zwischen Tag und Woche
- Wochen-Navigation vor/zurück (wie im Wochenplaner)
- Historie: Alle vergangenen Wochen einsehbar
- Basiert auf MealPlan-Einträgen (geplante Mahlzeiten)

### Zutatenverwaltung

- Eigener Bereich (Menüpunkt oder Unterseite)
- Liste aller Zutaten mit Suche
- Zutaten hinzufügen, bearbeiten, löschen
- Nährwerte pro 100g pflegen

## Nährwerte (Variante B)

| Nährwert | Einheit |
|----------|---------|
| Kalorien | kcal |
| Protein | g |
| Fett | g |
| Gesättigte Fettsäuren | g |
| Kohlenhydrate | g |
| Zucker | g |
| Ballaststoffe | g |

Erweiterbar auf Variante C (Vitamine, Mineralstoffe) in Zukunft.

## Technische Hinweise

- Next.js 15, Prisma, PostgreSQL, Tailwind CSS
- UI-Sprache: Deutsch
- Code-Sprache: Englisch
- Bestehende Patterns folgen (Server Components, API Routes)
