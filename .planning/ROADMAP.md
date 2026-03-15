# Roadmap: Meal Planner

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped)
- 🚧 **v1.1 Nährstoffe** - Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED</summary>

### Phase 1: Projekt-Setup & Auth
**Goal**: Lauffähige Next.js-App mit PostgreSQL, Prisma und NextAuth.js-Authentifizierung.
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, PWA-01, PWA-02

Plans:
- [x] Next.js Projekt initialisieren (TypeScript, Tailwind CSS, App Router)
- [x] PostgreSQL-Datenbank einrichten
- [x] Prisma ORM konfigurieren + User-Schema
- [x] NextAuth.js mit Credentials Provider
- [x] Auth-Seiten: Login & Registrierung
- [x] Geschützte Routen (Middleware)
- [x] PWA-Grundkonfiguration (Manifest, Icons)
- [x] Dockerfile + docker-compose.yml

### Phase 2: Rezept-Datenbank
**Goal**: Rezepte anlegen, bearbeiten, löschen und durchsuchen.
**Requirements**: REZ-01, REZ-02, REZ-03, REZ-04

Plans:
- [x] Prisma-Schema: Recipe Model
- [x] Rezept-Formular (erstellen/bearbeiten)
- [x] Rezeptliste mit Suche und Filterung
- [x] Rezept-Detailansicht
- [x] Kategorien/Tags System

### Phase 3: Wochenplaner
**Goal**: Funktionierender Wochenplan mit Live-Updates.
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04

Plans:
- [x] Prisma-Schema: MealPlan Model
- [x] Kalender-UI: Wochenansicht mit 2 Slots pro Tag
- [x] Rezept einem Slot zuweisen
- [x] Navigation zwischen Wochen
- [x] Auto-Refresh / geteilter Familienplan

### Phase 4: KI-Inspiration
**Goal**: KI-gestützte Rezeptvorschläge — aktiv und automatisch.
**Requirements**: KI-01, KI-02

Plans:
- [x] Claude API-Integration
- [x] Chat-Interface für aktive Anfragen
- [x] Automatische Vorschläge
- [x] "Als Rezept übernehmen" Funktion

### Phase 5: Polish & Deploy
**Goal**: App produktionsreif machen und auf VPS deployen.

Plans:
- [x] UI-Feinschliff und Mobile-Optimierung
- [x] PWA-Optimierung (Icons, Splash Screen)
- [x] Error-Handling und Loading-States
- [x] Docker-Image bauen und auf VPS deployen
- [x] YunoHost: Subdomain + Reverse-Proxy konfigurieren

</details>

---

### 🚧 v1.1 Nährstoffe (In Progress)

**Milestone Goal:** Strukturierte Zutaten mit Nährwertdatenbank, Nährstoffberechnung pro Rezept und persönliche Nährwert-Historie.

- [x] **Phase 6: Schema & Data Foundation** - Datenbankschema für Zutaten und Nährwerte, USDA-Seed (completed 2026-03-15)
- [ ] **Phase 7: Ingredient Admin UI** - Zutatenverwaltung: suchen, hinzufügen, bearbeiten, löschen
- [ ] **Phase 8: Structured Ingredient Entry & Nutrition Display** - Autocomplete-Zutateneingabe im Rezept, Nährwertanzeige pro Portion
- [ ] **Phase 9: AI Matching & Estimation** - Auto-Matching beim URL/KI-Import, KI-Fallback für unbekannte Zutaten
- [ ] **Phase 10: Nutrition History** - "Meine Nährwerte" mit Tages-/Wochenansicht und Historien-Navigation

## Phase Details

### Phase 6: Schema & Data Foundation
**Goal**: The nutritional database exists and is populated with German-friendly ingredient data, and the schema supports 2 meals per day per user.
**Depends on**: Phase 5
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05
**Success Criteria** (what must be TRUE):
  1. An `Ingredient` table exists with nutrition fields per 100g (kcal, protein, fat, saturated fat, carbs, sugar, fiber) and German name aliases
  2. A `RecipeIngredient` join table exists linking recipes to ingredients with amount and unit
  3. The MealPlan schema supports 2 distinct meals per user per day (Mittag + Abend) without constraint errors
  4. Fuzzy ingredient search via `pg_trgm` returns results for German ingredient names against the seeded data
  5. The seed script has run and the ingredient DB contains data for common German cooking ingredients
**Plans:** 3/3 plans complete

Plans:
- [ ] 06-01-PLAN.md — Prisma schema migration (Ingredient, RecipeIngredient, MealType, Unit, pg_trgm, GIN indexes)
- [ ] 06-02-PLAN.md — USDA SR Legacy seed script with German translations
- [ ] 06-03-PLAN.md — Week planner mealType API + UI integration

### Phase 7: Ingredient Admin UI
**Goal**: Users can manage the ingredient database — searching, adding, editing, and deleting entries — directly in the app.
**Depends on**: Phase 6
**Requirements**: VIEW-05
**Success Criteria** (what must be TRUE):
  1. User can navigate to a "Zutaten" page and see a searchable list of all ingredients
  2. User can create a new ingredient with name, unit, and nutrition values per 100g
  3. User can edit an existing ingredient's name, aliases, and nutrition values
  4. User can delete an ingredient (with safe handling if it is linked to recipes)
**Plans:** 1/2 plans executed

Plans:
- [ ] 07-01-PLAN.md — Ingredient CRUD API routes + shared components (form, delete button, nav icon)
- [ ] 07-02-PLAN.md — Ingredient page routes (list, create, edit) + human verification

### Phase 8: Structured Ingredient Entry & Nutrition Display
**Goal**: Users can attach structured ingredients to recipes and immediately see calculated nutrition per portion on the recipe detail page.
**Depends on**: Phase 7
**Requirements**: INPUT-01, INPUT-02, VIEW-01
**Success Criteria** (what must be TRUE):
  1. User can type an ingredient name in the recipe form and see autocomplete suggestions drawn from the ingredient database
  2. User can set an amount and unit for each ingredient in the recipe
  3. Recipes with structured ingredients show a nutrition table (kcal, protein, fat, carbs) per portion on the detail page
  4. Recipes without structured ingredients still display their existing freetext ingredient list (no regression)
**Plans**: TBD

### Phase 9: AI Matching & Estimation
**Goal**: Ingredients are automatically linked from structured data when saving a recipe from a URL import or an AI suggestion, and unmatched ingredients receive AI-estimated nutrition values.
**Depends on**: Phase 8
**Requirements**: INPUT-03, INPUT-04, INPUT-05
**Success Criteria** (what must be TRUE):
  1. When a recipe is imported via URL, its ingredients are automatically matched against the ingredient DB where a confident match exists
  2. When an AI-generated recipe is saved, its ingredients are automatically matched against the ingredient DB
  3. Ingredients with no DB match receive AI-estimated nutrition values so the recipe still shows a complete (approximate) nutrition total
  4. The recipe detail page marks nutrition totals as approximate (e.g., "~") when any ingredient relies on an AI estimate
**Plans**: TBD

### Phase 10: Nutrition History
**Goal**: Users can see their personal nutritional intake for any day or week, with navigation back through past history.
**Depends on**: Phase 9
**Requirements**: VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. User can open "Meine Nährwerte" and see today's intake broken down by meal (Mittag + Abend) with kcal, protein, fat, carbs
  2. User can switch to a weekly view showing a bar chart of daily totals and an average for the selected week
  3. User can navigate backward and forward through weeks to review nutritional history
  4. A 5th nav tab links to "Meine Nährwerte" and is accessible from any screen
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Projekt-Setup & Auth | v1.0 | — | Complete | — |
| 2. Rezept-Datenbank | v1.0 | — | Complete | — |
| 3. Wochenplaner | v1.0 | — | Complete | — |
| 4. KI-Inspiration | v1.0 | — | Complete | — |
| 5. Polish & Deploy | v1.0 | — | Complete | — |
| 6. Schema & Data Foundation | 3/3 | Complete   | 2026-03-15 | - |
| 7. Ingredient Admin UI | 1/2 | In Progress|  | - |
| 8. Structured Ingredient Entry & Nutrition Display | v1.1 | 0/? | Not started | - |
| 9. AI Matching & Estimation | v1.1 | 0/? | Not started | - |
| 10. Nutrition History | v1.1 | 0/? | Not started | - |
