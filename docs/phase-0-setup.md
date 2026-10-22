# Phase 0 – Setup

Grundgerüst: Nuxt 4 im Projektordner, shadcn-vue, dunkles Theme, Drizzle + SQLite, Docker, CI.

## Bedienung

- `pnpm dev` startet die App auf <http://127.0.0.1:3000> (unter Windows `127.0.0.1` statt `localhost` – schnellere DNS-Auflösung).
- Linke Sidebar (einklappbar über das Symbol oben links) mit allen Seiten: Heute, Woche, Übersicht, Kalender, Merker & Daily, Notizen, Konten & Aufgaben, Einstellungen. Noch nicht umgesetzte Seiten zeigen „Kommt in Phase X“.
- `GET /api/health` liefert `{ ok: true }` inkl. DB-Ping (503 bei DB-Fehler).

## Technik & Entscheidungen

### Stack & Versionen
- Nuxt 4.5, Vue 3.5, Tailwind v4 (`@tailwindcss/vite`), shadcn-vue (Reka UI, Stil *nova*), Drizzle ORM 0.45 + `@libsql/client`, zod 4, Vitest 5.
- **pnpm 12** (festgelegt über `packageManager` in `package.json`), **Node ≥ 22** (CI und Docker nutzen Node 22).
- **TypeScript auf `~6.0` gepinnt** – typescript-eslint unterstützt TS 7 noch nicht.
- **Icons aus `@lucide/vue`** (Nachfolger von `lucide-vue-next`; so generiert shadcn-vue die Komponenten).
- **Schrift self-hosted** (heute Geist/Geist Mono über `@fontsource-variable/geist`, davor Montserrat und Inter – siehe [Phase 7](phase-7-cloudypanda.md)) statt Google Fonts (offline-fähig, keine externe Anfrage).

### pnpm-Build-Skripte
pnpm 12 blockiert Postinstall-Skripte, bis sie freigegeben sind. Freigaben in `pnpm-workspace.yaml`:
`esbuild` ✔, `vue-demi` ✔, `unrs-resolver` ✘ (liefert vorkompilierte Binaries).

### Theme
- Tokens aus Plan §6 in `app/assets/css/main.css`, Dark-only (`<html class="dark">` fest in `nuxt.config.ts`).
- Kontofarben als Tailwind-Farben (`bg-konto-mint` …) plus dunkle Textfarbe je Farbton (`text-konto-mint-fg`, Plan §6: `oklch(0.22 0.03 <hue>)`).
- Utility `schraffiert` für geplante Blöcke.
- **Redesign** (Nachtrag, inzwischen abgelöst durch [Phase 7](phase-7-cloudypanda.md)): neues warmes Design für Farben, Schrift, Buttons und Logo.
  - Farben: warme Neutraltöne `#121212`/`#1B1A18`/`#252422`, Primär Gold `#DFAB40`, eigene Grün-/Rottöne für Plus/Minus, Charts Orange → Lindgrün; Token-Tabelle in Plan §6. Hintergrund bewusst einfarbig (kein Verlauf).
  - Kontofarben bleiben die acht Pastelltöne: Die warme Akzentreihe ist zu ähnlich für acht Konten, und die Farbschlüssel stehen in der DB.
  - Schrift Montserrat; Headlines (`h1–h3` und `cn-font-heading` der shadcn-Titel) ExtraBold per Base-Layer, dafür in den shadcn-Titeln `font-medium` entfernt.
  - Buttons als Pille (`rounded-full` in `ui/button/index.ts`, auch `xs`/`sm`/`icon-*`).
  - Logo: `AppLogo.vue` ist das Icon (Kalenderblatt mit aufgehender Sonne) ohne Hintergrund, Striche in `currentColor`, Sonne in `--primary`, Mask-ID per `useId()`. Wortmarke in der Sidebar als Text „daybreak“ (Black, kleingeschrieben). `public/favicon.svg` ist dasselbe Icon als App-Icon mit dunklem Hintergrund (feste Farben, da Favicons kein CSS erben). Formänderungen in beiden Dateien nachziehen.
- Keine PWA: Installation bräuchte HTTPS, Daybreak bleibt ein lokales Tool.
- **Zahlenfelder** immer über `ZahlInput` (Wrapper um shadcn `NumberField`, deutsches Zahlenformat, `−`/`+`-Buttons, leer = `null`) – kein natives `type="number"` mit Browser-Spinnern. **Uhrzeiten** über `UhrzeitInput` (`type="time"`, 15-min-Raster, `w-36`).
- ⚠️ **shadcn-CLI:** `shadcn-vue add` schreibt jedes Mal einen Google-Fonts-Import und einen doppelten `@layer base` in `main.css`. Nach jedem `add` die Datei zurücksetzen (`git checkout -- app/assets/css/main.css`) bzw. prüfen.

### Datenbank & Migrationen
- Schema in `server/db/schema.ts` (vollständig nach Plan §4), Client in `server/db/client.ts`. Pfad nur über `DATABASE_URL` (Default `file:./data/daybreak.db`); fehlende Verzeichnisse werden angelegt.
- **Abweichung vom Plan:** Statt eines separaten `migrate.mjs` wendet ein **Nitro-Server-Plugin** (`server/plugins/migrate.ts`) die Migrationen beim Serverstart an; die Middleware `server/middleware/00.migrations.ts` lässt Requests erst danach durch. Grund: Ein eigenständiges Skript bräuchte im Image vollständige `drizzle-orm`/`@libsql/client`-Pakete, die Nitro nicht mitkopiert. So gilt lokal und im Container derselbe Weg, ohne `drizzle-kit` zur Laufzeit. Schlägt eine Migration fehl, beendet sich der Prozess.
- Neue Migration: Schema ändern → `pnpm db:generate --name <name>` → Dev-Server neu starten.
- **libsql-Binary:** libsql lädt sein natives Binary dynamisch; Nitros Tracing erkennt das nicht. `nuxt.config.ts` gibt das installierte Plattform-Paket per `nitro.externals.traceInclude` mit (lokal `win32-x64-msvc`, im Container `linux-x64-gnu`).

### Zugangsschutz (Plan §9)
- Ist `DAYBREAK_PASSWORD` gesetzt, verlangt `server/middleware/01.auth.ts` HTTP Basic Auth (Benutzer beliebig, timing-sicherer Vergleich über SHA-256-Digests). `/api/health` ist ausgenommen.
- Ohne Variable: Warnung beim Start (`server/plugins/auth-warning.ts`).

### Docker & CI
- `Dockerfile` (Multi-Stage auf `node:22-slim`, läuft als `node`, `VOLUME /data`, `HEALTHCHECK` gegen `/api/health`, `TZ=Europe/Berlin`), `docker-compose.yml`, `.dockerignore`.
- Workflows: `.github/workflows/ci.yml` (lint, typecheck, test, build) und `docker.yml` (Image nach GHCR **nur bei veröffentlichten GitHub-Releases**, Tag `vX.Y.Z` → Image-Tags `X.Y.Z`, `X.Y` und `latest`; Pre-Releases ohne `latest`). Multi-Arch-Image für `linux/amd64` und `linux/arm64` (Apple Silicon); arm64 wird per QEMU emuliert, der Build dauert dadurch deutlich länger.
- Repo: `git@github.com:SleepyPxnda/daybreak.git`, Branch `main`.
- `.gitattributes` erzwingt LF-Zeilenenden (Container-Skripte).

## Projektstruktur

```
app/        Seiten, Komponenten (ui/ = shadcn, generiert), Composables, Utils
server/     api/ (Routen), db/ (Schema, Client, Migrate), middleware/, plugins/, utils/
shared/     utils/ – reine Fachlogik, in App und Server auto-importiert
tests/      Vitest
drizzle/    Migrationen
docs/       diese Dokumentation
```

## Offen / bekannte Grenzen

- **Docker und CI sind ungetestet** (`docker compose up --build`, Neustart-Persistenz, CI auf Push).
- `pnpm build` braucht unter Windows ~4 min (Nitro-Tracing); bricht man ihn ab, kann ein verwaister Prozess die Build-Sperre halten → Prozess beenden oder `NUXT_IGNORE_LOCK=1`.
- Unter Node 25 erscheinen `DEP0155`-Deprecation-Warnungen aus `@vue/shared`/`@vueuse` – harmlos.
- Nach dem libsql-Fix wurde der gebaute Server (`node .output/server/index.mjs`) nicht erneut gestartet.
