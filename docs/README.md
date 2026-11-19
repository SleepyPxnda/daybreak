# Daybreak – Documentation

Personal work dashboard: plan and book time, hours balance, vacation, reminders, daily topics, notes. The UI is in German; the German UI labels are quoted in this documentation where you will see them in the app.
Architecture in [`ARCHITECTURE.md`](ARCHITECTURE.md), overview in [`SPEC.md`](SPEC.md), working rules in [`CLAUDE.md`](../CLAUDE.md).
This documents what was **actually** built per phase – including decisions and deviations from the plan.

| Phase | Topic | State |
|---|---|---|
| [0](phase-0-setup.md) | Setup: Nuxt, theme, DB, Docker, CI | done (Docker/CI untested) |
| [1](phase-1-time.md) | Time: timeline, quick input, hours balance, templates | done |
| [2](phase-2-reminders.md) | Reminders, waiting for, daily topics, command palette | done |
| [3](phase-3-notes.md) | Notes: markdown editor, tags, search, pinning | done |
| [4](phase-4-calendar.md) | Calendar, vacation account, week | done |
| [5](phase-5-overview.md) | Overview: account → task → days, hours balance history | done |
| [6](phase-6-booking-notifications.md) | Browser notifications to book time | done |
| [7](phase-7-cloudypanda.md) | Redesign to the cloudypanda brand system | done |

## Quick start

```bash
pnpm install
pnpm db:seed      # optional: empties the DB and fills it with ~2 months of test data around today
pnpm dev          # http://127.0.0.1:3000 – migrations run automatically at startup
```

More commands: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:generate`.

## Pages

| Page | URL |
|---|---|
| Heute | `/` (`?date=YYYY-MM-DD`, `?dayClosing=1`) |
| Woche | `/week` (`?week=<date>`) |
| Übersicht | `/overview` (`?mode=week\|month\|custom\|month-closing`, `?date`, `?from`, `?to`) |
| Kalender | `/calendar` (`?year`) |
| Merker & Daily | `/todos` |
| Notizen | `/notes` (`?id`, `?tag`) |
| Konten & Aufgaben | `/accounts` (`?accountId`), task detail `/tasks/:id` |
| Einstellungen | `/settings` (vacation entitlement: `#vacation`) |

## Most important controls at a glance

| Action | How |
|---|---|
| Command palette (book, reminders, search, navigate) | `Ctrl+K` / `⌘K` |
| Book time | `2h PROJ-123 Review`, `9:00-10:30 mtg`, `p 30m` |
| Plan time | `plan 3h PROJ-123 morgen` |
| Reminder / daily topic / waiting for | `t …`, `d …`, `w Tim: … bis fr` |
| New note | `n Titel` |
| Create a block | drag on the timeline |
| Zoom / move the timeline | `Ctrl`+mouse wheel / `Shift`+mouse wheel or middle mouse button |
| Enter vacation | calendar: drag over days → "Urlaub" |

Details in the phase documents.
