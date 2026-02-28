# Erweiterte Bearbeitung, Registrierung abschalten, Familienmitglieder bearbeiten

## Zusammenfassung

Drei Änderungen: (1) Registrierungsseite abschalten, (2) Familienmitglieder-Daten bearbeitbar machen, (3) Wochenplan-Einträge vollständig bearbeiten (Rezept/Freitext, Personen, Datum).

## Änderungen

### 1. Registrierung abschalten
- Seite `/register` entfernen (oder redirect auf `/login`)
- API `/api/auth/register` bleibt — wird von Familie-Seite zum Anlegen genutzt

### 2. Familienmitglieder bearbeiten
- Bearbeiten-Button pro Mitglied auf der Familie-Seite
- Formular mit: Name, E-Mail, Passwort (optional)
- Neuer Endpoint: `PUT /api/users/[id]`
- Jeder eingeloggte User kann jeden bearbeiten

### 3. Erweiterte Eintrag-Bearbeitung
- Beim Bearbeiten: Rezept/Freitext + Personen-Checkboxen + Datumswähler
- Datums-Konflikt: Bestätigungsdialog ("Überschreiben?" / "Abbrechen")
- PUT-Endpoint erweitern um `forUserIds` und `date`

## Betroffene Dateien

- `src/app/(auth)/register/page.tsx` — entfernen oder redirect
- `src/app/(app)/familie/page.tsx` — Bearbeiten-UI hinzufügen
- `src/app/api/users/[id]/route.ts` — neuer PUT-Endpoint
- `src/app/api/meal-plans/route.ts` — PUT erweitern (Datum, Personen)
- `src/components/week-planner.tsx` — Edit-Flow anpassen
- `src/components/recipe-picker.tsx` — Personen-Auswahl + Datumswähler im Edit-Modus
