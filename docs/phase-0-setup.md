# Phase 0 – Setup

Skeleton: Nuxt 4 in the project folder, shadcn-vue, dark theme, Drizzle + SQLite, Docker, CI.

## Usage

- `pnpm dev` starts the app at <http://127.0.0.1:3000> (on Windows use `127.0.0.1` instead of `localhost` – faster DNS resolution).
- Left sidebar (collapsible via the icon at the top left) with all pages: Heute, Woche, Übersicht, Kalender, Merker & Daily, Notizen, Konten & Aufgaben, Einstellungen. Pages that were not built yet showed "Kommt in Phase X" (coming in phase X).
- `GET /api/health` returns `{ ok: true }` including a DB ping (503 on a DB error).

## Technology & decisions

### Stack & versions
- Nuxt 4.5, Vue 3.5, Tailwind v4 (`@tailwindcss/vite`), shadcn-vue (Reka UI, style *nova*), Drizzle ORM 0.45 + `@libsql/client`, zod 4, Vitest 5.
- **pnpm 12** (fixed via `packageManager` in `package.json`), **Node ≥ 22** (CI and Docker use Node 22).
- **TypeScript pinned to `~6.0`** – typescript-eslint does not support TS 7 yet.
- **Icons from `@lucide/vue`** (successor of `lucide-vue-next`; this is how shadcn-vue generates the components).
- **Self-hosted font** (today Geist/Geist Mono via `@fontsource-variable/geist`, before that Montserrat and Inter – see [phase 7](phase-7-cloudypanda.md)) instead of Google Fonts (works offline, no external request).

### pnpm build scripts
pnpm 12 blocks postinstall scripts until they are approved. Approvals in `pnpm-workspace.yaml`:
`esbuild` ✔, `vue-demi` ✔, `unrs-resolver` ✘ (ships precompiled binaries).

### Theme
- Tokens from the original plan (§6) in `app/assets/css/main.css`, dark only (`<html class="dark">` fixed in `nuxt.config.ts`).
- Account colors as Tailwind colors (`bg-account-mint` …) plus a dark text color per hue (`text-account-mint-fg`, `oklch(0.22 0.03 <hue>)`).
- Utility `hatched` for planned blocks.
- **Redesign** (addendum, since superseded by [phase 7](phase-7-cloudypanda.md)): a new warm design for colors, font, buttons and logo.
  - Colors: warm neutrals `#121212`/`#1B1A18`/`#252422`, primary gold `#DFAB40`, own greens and reds for plus/minus, charts from orange to lime green. The background is deliberately a solid color (no gradient).
  - Account colors stay the eight pastel tones: the warm accent range is too similar for eight accounts, and the color keys are stored in the DB.
  - Font Montserrat; headlines (`h1–h3` and `cn-font-heading` of the shadcn titles) ExtraBold via a base layer, with `font-medium` removed from the shadcn titles.
  - Buttons as pills (`rounded-full` in `ui/button/index.ts`, also `xs`/`sm`/`icon-*`).
  - Logo: `AppLogo.vue` is the icon (calendar leaf with a rising sun) without a background, strokes in `currentColor`, sun in `--primary`, mask ID via `useId()`. The wordmark in the sidebar is the text "daybreak" (black weight, lowercase). `public/favicon.svg` is the same icon as an app icon with a dark background (fixed colors, because favicons do not inherit CSS). Keep the shape in both files in sync.
- No PWA: installing would need HTTPS, and daybreak stays a local tool.
- **Number fields** always through `NumberInput` (wrapper around shadcn `NumberField`, German number format, `−`/`+` buttons, empty = `null`) – no native `type="number"` with browser spinners. **Times** through `TimeInput` (`type="time"`, 15-minute grid, `w-36`).
- ⚠️ **shadcn CLI:** `shadcn-vue add` writes a Google Fonts import and a duplicate `@layer base` into `main.css` every time. After each `add`, reset the file (`git checkout -- app/assets/css/main.css`) or check it.

### Database & migrations
- Schema in `server/db/schema.ts` (complete), client in `server/db/client.ts`. Path only via `DATABASE_URL` (default `file:./data/daybreak.db`); missing directories are created.
- **Deviation from the plan:** instead of a separate `migrate.mjs`, a **Nitro server plugin** (`server/plugins/migrate.ts`) applies the migrations at server start; the middleware `server/middleware/00.migrations.ts` lets requests through only afterwards. Reason: a standalone script would need complete `drizzle-orm`/`@libsql/client` packages in the image, which Nitro does not copy. This way the same path applies locally and in the container, without `drizzle-kit` at runtime. If a migration fails, the process exits.
- New migration: change the schema → `pnpm db:generate --name <name>` → restart the dev server.
- **libsql binary:** libsql loads its native binary dynamically; Nitro's tracing does not detect that. `nuxt.config.ts` passes the installed platform package via `nitro.externals.traceInclude` (locally `win32-x64-msvc`, in the container `linux-x64-gnu`).

### Access protection
- If `DAYBREAK_PASSWORD` is set, `server/middleware/01.auth.ts` requires HTTP Basic Auth (any user, timing-safe comparison via SHA-256 digests). `/api/health` is exempt.
- Without the variable: a warning at startup (`server/plugins/auth-warning.ts`).

### Docker & CI
- `Dockerfile` (multi-stage on `node:22-slim`, runs as `node`, `VOLUME /data`, `HEALTHCHECK` against `/api/health`, `TZ=Europe/Berlin`), `docker-compose.yml`, `.dockerignore`.
- Workflows: `.github/workflows/ci.yml` (lint, typecheck, test, build) and `docker.yml` (image to GHCR **only on published GitHub releases**, tag `vX.Y.Z` → image tags `X.Y.Z`, `X.Y` and `latest`; pre-releases without `latest`). Multi-arch image for `linux/amd64` and `linux/arm64` (Apple Silicon); arm64 is emulated via QEMU, so the build takes noticeably longer.
- Repo: `git@github.com:SleepyPxnda/daybreak.git`, branch `main`.
- `.gitattributes` enforces LF line endings (container scripts).

## Project structure

```
app/        pages, components (ui/ = shadcn, generated), composables, utils
server/     api/ (routes), db/ (schema, client, migrate), middleware/, plugins/, utils/
shared/     utils/ – pure business logic, auto-imported in app and server
tests/      Vitest
drizzle/    migrations
docs/       this documentation
```

## Open / known limits

- **Docker and CI are untested** (`docker compose up --build`, restart persistence, CI on push).
- `pnpm build` takes ~4 min on Windows (Nitro tracing); if you abort it, an orphaned process can hold the build lock → kill the process or use `NUXT_IGNORE_LOCK=1`.
- On Node 25, `DEP0155` deprecation warnings from `@vue/shared`/`@vueuse` appear – harmless.
- After the libsql fix, the built server (`node .output/server/index.mjs`) was not started again.
