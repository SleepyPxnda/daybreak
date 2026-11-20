# Daybreak

Personal work dashboard (plan and book time, hours balance, vacation, reminders, daily topics, notes). Single user, run locally or self-hosted via Docker. All code is English; only the UI is German.

## Hard rules
- No Kanban, no issue/ticket system or ticket integration, no export to the company system, no legal break-rule checks, no multi-user.
- Time is booked as blocks on a 15-minute grid (planned or booked), never with running timers.
- One SQLite file is the whole data store; everything must run in the Docker image with `Europe/Berlin` for day boundaries.
- Archived accounts and closed tasks disappear from suggestions, never from totals.

## Architecture
Nuxt 4 app with Nitro API and Drizzle/SQLite in one process; business logic as pure functions in `shared/utils/`.
Read `docs/ARCHITECTURE.md` before adding a file; it is binding. Shipped behaviour per area: `docs/SPEC.md`.

## Stack
Nuxt 4 · shadcn-vue (Reka UI) · Tailwind v4 · Drizzle ORM + SQLite (`@libsql/client`) · date-fns · feiertagejs · zod · vitest · pnpm

## Tooling
- MCP servers in `.mcp.json`: `nuxt` (Nuxt docs/modules) and `shadcn` (shadcn-vue registry).
- Use the Nuxt MCP for Nuxt API questions instead of guessing (Nuxt 4, `app/` directory).
- Add shadcn-vue components only via MCP or `pnpm dlx shadcn-vue@latest add <name>`, never rebuild them by hand.

## Commands
- `pnpm install` – install
- `pnpm dev` – dev server at http://localhost:3000
- `pnpm test` – Vitest
- `pnpm typecheck` / `pnpm lint`
- `pnpm build` – production build
- `pnpm db:generate` – migration from `server/db/schema.ts` (migrations apply at startup)
- `pnpm db:seed` – fill the DB with test data (empties it first)
- `docker compose up --build` – test the production image locally

## Conventions

1. **Language:** all code is English: identifiers, file and folder names, API paths, DB tables and columns, comments, tests, docs (`account`, `task`, `block`, `template`, `reminder`, `waitingFor`, `dailyTopic`, `note`, `target`, `actual`, `balance`, `bookingNotification` for the browser notifications, `assignment` for where a block is booked to). Only user-facing text is German: UI labels, toasts, `statusMessage` of errors, the quick-input syntax users type. The German domain terms (Konto, Aufgabe, Block, Vorlage, Merker, Warten auf, Daily-Thema, Notiz, Soll, Ist, Saldo) appear only in the UI.
2. **API routes:** one file per route under `server/api/<entity>/` with English plural paths: `index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].patch.ts`, `[id].delete.ts`; special actions as `<verb>.post.ts` or `[id]/<verb>.post.ts`. Sub-routes go into the folder next to `index.get.ts`, never as `<entity>.get.ts` + `<entity>/`.
3. **Validation:** every input validated with zod at the route: `readValidatedBody(event, schema.parse)`, `getValidatedQuery(event, schema.parse)`, the ID via the shared route-ID helper. Entity schemas (`<entity>Fields`, `create<Entity>Schema`, PATCH with `.partial()`) live in the entity's util `server/utils/<entity>.ts`; route-only schemas inline as `const schema`. Dates as `YYYY-MM-DD` strings, times as minutes since midnight on the 15-minute grid, through the shared date/time schemas.
4. **Errors:** only `throw createError({ statusCode, statusMessage: '<German message>' })`; 404 via the not-found helper, UNIQUE violation → 409 via the unique-error helper. Codes: 400 invalid by business rule, 404, 409 conflict.
5. **Imports:** `server/utils` is auto-imported; `db` and tables imported relatively; `shared/utils` always imported explicitly via `#shared/utils/<file>` (server and client); components via `~/components/...`, also those in `ui/`.
6. **Client data:** reads with `useFetch(url, { key: '<fixed-key>' })`, not awaited, always with an explicit `key`. Mutations always through the action helper with `api()` and a `*_KEYS` constant for the refresh (no inline key arrays); `api()` is only for mutations. Shared queries and their key lists live in `app/composables/`; a composable file is named after the function it exports. No Pinia; global UI state via `useState('<key>')`.
7. **Components:** PascalCase `.vue` files in English, feature components in English kebab-case subfolders, imported explicitly. shadcn-vue components in `app/components/ui/` only via MCP or `pnpm dlx shadcn-vue@latest add <name>`, then check or reset `app/assets/css/main.css`. Numbers through the number-input component, times through the time-input component, never native `type="number"`.
8. **Business logic & tests:** rules (quick-input parser, target/balance, vacation, templates, booking notifications) as pure functions in `shared/utils/` without DB access; tests flat in `tests/<module>.test.ts` (Vitest, Node) with relative imports. Routes fetch data and call these functions.
9. **Design:** cloudypanda brand system, dark only (tokens in `app/assets/css/main.css`): Geist/Geist Mono, amber as the only accent, layers instead of shadows. Colors only through tokens/Tailwind classes, no hex values and no `shadow-*` in components.
10. **Operations:** DB path only via `DATABASE_URL` (default `file:./data/daybreak.db`); schema changes only through `server/db/schema.ts` + `pnpm db:generate`, never edit `drizzle/` by hand, except the SQL file of a `pnpm db:generate --custom` migration for data changes (snapshots and `_journal.json` never; migrations run at startup). Everything must run in the Docker image (`Europe/Berlin` for day boundaries); CI (lint, typecheck, test, build) stays green; no features outside the vision.
11. **Naming:** no single-letter or German-initial identifiers (`z`, `k`, `a`) and no German string prefixes or keys (`'a:'`, `` `leer${i}` ``) outside trivial lambdas; spell names out (`task`, `account`, `assignment`).
12. **Inline edits:** a field that saves on its own (one field per request) must, on a rejected save, show the stored value again and set `aria-invalid` on that field until it saves or the shown data set changes; the toast still comes from `runAction()`. Forms, dialogs and autosave editors stay toast-only.
13. **Forms and fetched data:** a form that copies `useFetch` data into local state re-copies new server data only while it has no unsaved changes (compare against the last copied state) and copies the stored values explicitly after its own save; never an unconditional `watchEffect` copy.
