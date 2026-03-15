# Meal Planner — Familien-Essensplaner

## Vision
Eine Progressive Web App (PWA) für eine 4-köpfige Familie zur gemeinsamen wöchentlichen Essensplanung. Einfach, schnell, mobil-optimiert — als App auf dem iPhone-Homescreen installierbar.

## Kernproblem
Jede Woche die gleiche Frage: "Was essen wir?" — fehlende Übersicht, vergessene Lieblingsgerichte, keine Inspiration. Die App löst das durch einen geteilten Wochenplan mit Rezept-Datenbank und KI-Unterstützung.

## Zielgruppe
- Eine Familie mit 4 Personen
- Primäres Gerät: iPhone (aber auch Desktop-fähig)
- Jedes Familienmitglied hat einen eigenen Login

## Infrastruktur
- **VPS mit YunoHost** (eigene Domain, bereits laufend: n8n, draw.io, uptime, kimiai)
- **Deployment:** Docker-Container hinter YunoHost-Nginx-Reverse-Proxy
- **Subdomain:** z.B. `essen.deinedomain.de` (über YunoHost konfiguriert)

## Tech Stack
| Komponente | Technologie |
|---|---|
| Frontend | Next.js 15 + React 19 |
| Styling | Tailwind CSS |
| Backend/DB | PostgreSQL (auf VPS) + Prisma ORM |
| Auth | NextAuth.js (Credentials Provider) |
| KI | Claude API (Anthropic) |
| Hosting | Eigener VPS (YunoHost) via Docker |
| PWA | next-pwa / Service Worker |

## Entscheidungen
- **PWA statt native App** — kein Apple Developer Account nötig, läuft auf allen Geräten
- **Eigener VPS statt Cloud** — Daten bleiben in der Familie, keine externen Abhängigkeiten
- **PostgreSQL + Prisma statt Supabase** — direkt auf dem VPS, volle Kontrolle, Prisma für typsicheren DB-Zugriff
- **NextAuth.js** — eigene App-Accounts (nicht YunoHost SSO), einfach und bewährt
- **Docker** — saubere Isolation, einfaches Deployment auf YunoHost
- **Deutsch als UI-Sprache** — Familienapp, kein internationaler Rollout geplant
- **2 Mahlzeiten pro Tag** — Mittagessen + Abendessen
- **Online-only** — kein Offline-Modus, vereinfacht die Architektur
- **Code & Kommentare auf Englisch** — Best Practice für Codebase

## Current Milestone: v1.1 Nährstoffe

**Goal:** Strukturierte Zutaten mit Nährwertdatenbank, Nährstoffberechnung pro Rezept, persönliche Nährwert-Historie.

**Target features:**
- Zutatendatenbank mit Nährwerten pro 100g (initial befüllt aus USDA)
- Strukturierte Zutaten pro Rezept mit Auto-Matching gegen DB
- KI-Schätzung für Nährwerte bei unbekannten Zutaten
- Nährstoffanzeige pro Portion auf Rezeptdetailseite
- "Meine Nährwerte" — persönliche Tages-/Wochenansicht mit Historie
- Zutatenverwaltung (hinzufügen, bearbeiten, löschen)

## Scope

### Milestone 1: MVP (shipped)
- Authentifizierung (Login/Registrierung pro Familienmitglied)
- Wochenplaner (Kalenderansicht, Gerichte zuweisen)
- Rezept-Datenbank (CRUD, Suche, Kategorien)
- KI-Inspiration (aktive Anfragen + automatische Vorschläge)
- PWA-Installation auf iPhone

### Milestone 2: Erweiterungen (später)
- Automatische Einkaufslisten aus Wochenplan
- Weitere Features nach Bedarf
