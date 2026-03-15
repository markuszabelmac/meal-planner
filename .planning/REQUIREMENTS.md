# Requirements — Milestone 1: MVP

## R1: Authentifizierung
- **R1.1** Registrierung mit E-Mail + Passwort
- **R1.2** Login / Logout
- **R1.3** Geschützte Routen (nur eingeloggte User sehen die App)
- **R1.4** Benutzername/Anzeigename pro Familienmitglied
- **R1.5** Anzeige wer ein Gericht eingetragen/geändert hat

## R2: Wochenplaner
- **R2.1** Kalenderansicht: aktuelle Woche + Navigation zu nächsten/vorherigen Wochen
- **R2.2** Zwei Slots pro Tag: Mittagessen + Abendessen
- **R2.3** Gericht aus Rezept-Datenbank einem Slot zuweisen
- **R2.4** Gericht von einem Slot entfernen
- **R2.5** Alle Familienmitglieder sehen den gleichen Plan (Realtime-Sync)
- **R2.6** Anzeige wer welches Gericht eingetragen hat
- **R2.7** Mobile-first Design (optimiert für iPhone)

## R3: Rezept-Datenbank
- **R3.1** Neues Rezept anlegen (Name, Beschreibung, Kategorie, Zutaten, optional: Zubereitungszeit, Portionen)
- **R3.2** Rezept bearbeiten und löschen
- **R3.3** Rezepte durchsuchen (Freitext-Suche)
- **R3.4** Kategorien/Tags für Rezepte (z.B. "Pasta", "Schnell", "Vegetarisch")
- **R3.5** Rezepte gehören allen (jeder kann alle Rezepte sehen und verwenden)
- **R3.6** Anzeige wer ein Rezept erstellt hat

## R4: KI-Inspiration
- **R4.1** Aktive Anfrage: User gibt Wünsche ein (z.B. "schnelles Abendessen mit Hähnchen"), KI schlägt Rezepte vor
- **R4.2** Automatische Vorschläge: App zeigt Inspirationen basierend auf vorhandenen Rezepten und Essenshistorie
- **R4.3** KI-Vorschlag direkt als neues Rezept übernehmen
- **R4.4** KI-Vorschlag direkt in den Wochenplan eintragen

## R5: PWA
- **R5.1** App ist auf iPhone-Homescreen installierbar
- **R5.2** Responsive Design (Mobile-first, aber auch Desktop-nutzbar)
- **R5.3** App-ähnliches Fullscreen-Erlebnis (kein Browser-Chrome)

## Nicht-funktionale Anforderungen
- **NF1** Ladezeit unter 3 Sekunden auf mobilem Netz
- **NF2** Prisma + PostgreSQL mit sauberer Zugriffskontrolle (Auth-Check in API-Routen)
- **NF3** Umgebungsvariablen für API-Keys (nie im Code)
