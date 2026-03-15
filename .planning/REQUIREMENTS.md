# Requirements: Meal Planner

**Defined:** 2026-02-11
**Core Value:** Gemeinsame wöchentliche Essensplanung für die Familie

## v1.0 Requirements (shipped)

### Authentifizierung
- [x] **AUTH-01**: User kann sich mit E-Mail + Passwort registrieren
- [x] **AUTH-02**: User kann sich ein-/ausloggen
- [x] **AUTH-03**: Geschützte Routen (nur eingeloggte User)
- [x] **AUTH-04**: Benutzername/Anzeigename pro Familienmitglied

### Wochenplaner
- [x] **PLAN-01**: Kalenderansicht mit Wochen-Navigation
- [x] **PLAN-02**: Zwei Slots pro Tag (Mittagessen + Abendessen)
- [x] **PLAN-03**: Gericht aus Rezept-Datenbank einem Slot zuweisen
- [x] **PLAN-04**: Alle Familienmitglieder sehen den gleichen Plan

### Rezept-Datenbank
- [x] **REZ-01**: Rezept anlegen (Name, Beschreibung, Kategorie, Zutaten, Zubereitungszeit, Portionen)
- [x] **REZ-02**: Rezept bearbeiten und löschen
- [x] **REZ-03**: Rezepte durchsuchen (Freitext-Suche)
- [x] **REZ-04**: Kategorien/Tags für Rezepte

### KI-Inspiration
- [x] **KI-01**: User gibt Wünsche ein, KI schlägt Rezepte vor
- [x] **KI-02**: KI-Vorschlag als neues Rezept übernehmen

### PWA
- [x] **PWA-01**: App ist auf iPhone-Homescreen installierbar
- [x] **PWA-02**: Responsive Design (Mobile-first)

## v1.1 Requirements

Requirements für Milestone v1.1: Nährstoffe.

### Datenbank (DB)
- [x] **DB-01**: Ingredient-Tabelle mit Nährwerten pro 100g (Kalorien, Protein, Fett, ges. Fettsäuren, Kohlenhydrate, Zucker, Ballaststoffe)
- [x] **DB-02**: RecipeIngredient-Verknüpfung (Rezept → Zutat mit Menge + Einheit)
- [x] **DB-03**: MealPlan unterstützt 2 Mahlzeiten pro Tag pro User
- [x] **DB-04**: pg_trgm Extension + GIN-Index für Fuzzy-Matching
- [x] **DB-05**: USDA Seed-Script mit deutschen Aliassen für gängige Zutaten

### Eingabe (INPUT)
- [ ] **INPUT-01**: User kann beim Rezept-Erstellen Zutaten per Autocomplete aus der Datenbank wählen
- [ ] **INPUT-02**: User kann Menge und Einheit pro Zutat eingeben
- [ ] **INPUT-03**: Bei URL-Import werden Zutaten automatisch gegen DB gematcht
- [ ] **INPUT-04**: Bei KI-Rezept-Speicherung werden Zutaten automatisch gegen DB gematcht
- [ ] **INPUT-05**: Unbekannte Zutaten erhalten KI-geschätzte Nährwerte als Fallback

### Anzeige (VIEW)
- [ ] **VIEW-01**: Rezeptdetailseite zeigt Nährwerte pro Portion
- [ ] **VIEW-02**: "Meine Nährwerte" zeigt Tagesansicht mit Aufschlüsselung pro Mahlzeit
- [ ] **VIEW-03**: "Meine Nährwerte" zeigt Wochenansicht mit Tageswerten + Durchschnitt
- [ ] **VIEW-04**: Wochen-Navigation vor/zurück für Nährwert-Historie
- [ ] **VIEW-05**: Zutatenverwaltung: User kann Zutaten suchen, hinzufügen, bearbeiten, löschen

## v2 Requirements

Deferred to future release.

- **SHOP-01**: Automatische Einkaufslisten aus Wochenplan
- **NUTR-C**: Erweiterte Nährwerte (Vitamine, Mineralstoffe)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline-Modus | Vereinfacht Architektur, Familie ist immer online |
| Barcode-Scanner | Zu komplex für v1.1, Open Food Facts ist produkt- nicht zutat-basiert |
| Kalorienziele / Diät-Tracking | Fokus auf Information, nicht auf Restriktion |
| BLS-Datenbank | Lizenzrestriktionen, USDA + deutsche Aliase als Alternative |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 6 | Complete |
| DB-02 | Phase 6 | Complete |
| DB-03 | Phase 6 | Complete |
| DB-04 | Phase 6 | Complete |
| DB-05 | Phase 6 | Complete |
| INPUT-01 | Phase 8 | Pending |
| INPUT-02 | Phase 8 | Pending |
| INPUT-03 | Phase 9 | Pending |
| INPUT-04 | Phase 9 | Pending |
| INPUT-05 | Phase 9 | Pending |
| VIEW-01 | Phase 8 | Pending |
| VIEW-02 | Phase 10 | Pending |
| VIEW-03 | Phase 10 | Pending |
| VIEW-04 | Phase 10 | Pending |
| VIEW-05 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-03-15 — Phase mappings added for v1.1 roadmap*
