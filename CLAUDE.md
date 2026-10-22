# Daybreak

Persönliches Arbeits-Dashboard (Zeit planen/buchen, Stundenkonto, Urlaub, Merker, Daily-Themen, Notizen). Single-User, lokal oder per Docker selbst gehostet.

**Die vollständige Spezifikation steht in `IMPLEMENTATION_PLAN.md` – vor jeder Aufgabe lesen und phasenweise umsetzen.**

## Stack
Nuxt 4 · shadcn-vue (Reka UI) · Tailwind v4 · Drizzle ORM + SQLite (`@libsql/client`) · date-fns · feiertagejs (BW) · zod · vitest · pnpm

## Tooling
- MCP-Server stehen in `.mcp.json`: `nuxt` (Nuxt-Doku/Module) und `shadcn` (shadcn-vue Registry). Mit `/mcp` prüfen.
- Vor Nuxt-API-Fragen den Nuxt MCP nutzen, nicht aus dem Gedächtnis raten (Nuxt 4, `app/`-Verzeichnis).
- shadcn-vue-Komponenten immer über MCP oder `pnpm dlx shadcn-vue@latest add <name>` hinzufügen, nie von Hand nachbauen.
- shadcn-vue Skill nach `shadcn-vue init` installieren: `pnpm dlx skills add unovue/shadcn-vue`.

## Konventionen
- UI-Texte und Fachbegriffe auf Deutsch (Konto, Aufgabe, Block, Vorlage, Merker, Warten auf, Daily-Thema, Notiz, Soll, Ist, Saldo). Code-Bezeichner dürfen die deutschen Fachbegriffe verwenden.
- Hierarchie: Konto (Sammlung) → Aufgabe (gehört zu genau einem Konto) → Blöcke an beliebigen Tagen. Blöcke können auch ohne Aufgabe direkt auf ein Konto gehen (abstrakte Konten wie Firmenmeeting). Siehe Plan §3.1.
- Datum als `YYYY-MM-DD`-String, Uhrzeiten als Minuten seit Mitternacht, 15-min-Raster.
- Fachlogik (Schnelleingabe-Parser, Soll/Saldo, Urlaub) als reine Funktionen in `shared/utils/` mit Vitest-Tests.
- Design nach dem cloudypanda-Markensystem, nur dunkel (Tokens in `app/assets/css/main.css`, siehe Plan §6): Geist/Geist Mono, Bernstein als einziger Akzent, Ebenen statt Schatten. Farben nur über Tokens, keine Hex-Werte in Komponenten.
- Keine Features außerhalb des Plans (kein Kanban, kein Export, keine Pausenregeln, keine Ticket-Integration).
- DB-Pfad nur über `DATABASE_URL` (Default `file:./data/daybreak.db`, gitignored); Schemaänderungen immer per `drizzle-kit generate` + Migration. Migrationen laufen im Container beim Start automatisch.
- Alles muss im Docker-Image laufen (Plan §9): keine Pfade/Abhängigkeiten, die nur lokal existieren; Zeitzone `Europe/Berlin` für Tagesgrenzen.
- CI (`.github/workflows/ci.yml`) muss grün bleiben: lint, typecheck, test, build.
- Jede Phase endet mit Dokumentation in `docs/phase-<n>-<thema>.md` (Bedienung, Fachregeln & Entscheidungen, Datenmodell & API, Offen) + Index `docs/README.md`; Fixes nachtragen. Siehe Plan §8.

## Befehle
- `pnpm dev` – Dev-Server
- `pnpm test` – Vitest
- `pnpm db:generate` / `pnpm db:migrate` – Drizzle-Migrationen
- `pnpm lint` / `pnpm typecheck`
- `docker compose up --build` – Produktions-Image lokal testen