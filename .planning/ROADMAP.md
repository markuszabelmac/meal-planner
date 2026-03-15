# Roadmap — Milestone 1: MVP

## Phase 1: Projekt-Setup & Auth
**Ziel:** Lauffähige Next.js-App mit PostgreSQL, Prisma und NextAuth.js-Authentifizierung.

- Next.js Projekt initialisieren (TypeScript, Tailwind CSS, App Router)
- PostgreSQL-Datenbank einrichten (lokal für Entwicklung)
- Prisma ORM konfigurieren + User-Schema
- NextAuth.js mit Credentials Provider (E-Mail + Passwort)
- Auth-Seiten: Login & Registrierung
- Geschützte Routen (Middleware)
- User-Profil mit Anzeigename
- PWA-Grundkonfiguration (Manifest, Icons)
- Dockerfile + docker-compose.yml für Deployment

**Liefert:** R1.1–R1.4, R5.1, R5.3

## Phase 2: Rezept-Datenbank
**Ziel:** Rezepte anlegen, bearbeiten, löschen und durchsuchen.

- Prisma-Schema: `Recipe` Model mit Relationen
- Rezept-Formular (erstellen/bearbeiten)
- Rezeptliste mit Suche und Filterung
- Rezept-Detailansicht
- Kategorien/Tags System
- Anzeige des Erstellers

**Liefert:** R3.1–R3.6, R1.5

## Phase 3: Wochenplaner
**Ziel:** Funktionierender Wochenplan mit Live-Updates.

- Prisma-Schema: `MealPlan` Model
- Kalender-UI: Wochenansicht mit 2 Slots pro Tag (Mittag + Abend)
- Rezept einem Slot zuweisen (Auswahl aus Datenbank)
- Navigation zwischen Wochen
- Auto-Refresh für Updates anderer Familienmitglieder (Polling)
- Anzeige wer was eingetragen hat

**Liefert:** R2.1–R2.7, R1.5, R5.2

## Phase 4: KI-Inspiration
**Ziel:** KI-gestützte Rezeptvorschläge — aktiv und automatisch.

- API-Route für Claude-Integration (serverseitig, API-Key geschützt)
- Chat-Interface für aktive Anfragen
- Automatische Vorschläge basierend auf Historie
- "Als Rezept übernehmen" Funktion
- "In Wochenplan eintragen" Funktion

**Liefert:** R4.1–R4.4

## Phase 5: Polish & Deploy
**Ziel:** App produktionsreif machen und auf VPS deployen.

- UI-Feinschliff und Mobile-Optimierung
- PWA-Optimierung (Icons, Splash Screen, Manifest)
- Error-Handling und Loading-States
- Docker-Image bauen und auf VPS deployen
- YunoHost: Subdomain + Reverse-Proxy konfigurieren
- Let's Encrypt SSL (über YunoHost)
- Familienaccounts anlegen und testen

**Liefert:** R5.1–R5.3, NF1–NF3
