# Spec

What daybreak does today, per area. The phase documents describe how each area was built; later features are added below.

Code, API paths, page URLs, database names and stored values are English; only the UI text is German. The page URLs are listed in [README.md](README.md).

| Area | Document |
|---|---|
| Setup: Nuxt, theme, DB, Docker, CI | [phase-0-setup.md](phase-0-setup.md) |
| Time: timeline, quick input, hours balance, templates | [phase-1-time.md](phase-1-time.md) |
| Reminders, waiting-for, daily topics, command palette | [phase-2-reminders.md](phase-2-reminders.md) |
| Notes: markdown editor, tags, search, pinning | [phase-3-notes.md](phase-3-notes.md) |
| Calendar, vacation account, week | [phase-4-calendar.md](phase-4-calendar.md) |
| Overview: account → task → days, balance history | [phase-5-overview.md](phase-5-overview.md) |
| Booking notifications (browser notifications to book time) | [phase-6-booking-notifications.md](phase-6-booking-notifications.md) |
| Redesign to the cloudypanda brand system | [phase-7-cloudypanda.md](phase-7-cloudypanda.md) |

## Refresh on return

When the tab or window becomes visible or gets focus again, daybreak re-reads everything the page and header show (timeline, day info, balance, todos, notes list, tasks, overview, settings), so blocks booked in another tab or on another device appear without a reload. Nothing is fetched while the tab stays in the background or focused, on first load, or within 2 seconds of the last refresh; there is no refresh indicator.

- If the server cannot be reached on return, nothing changes: the page keeps its data and day, shows no error, and tries again on the next return.
- The Today page (`/` without `?date=`) moves to the new day after midnight: "Heute", timeline, day setting, now-line and undated quick input (line on the page and `Strg+K`) follow it. With `?date=…` it stays on the chosen day; only the "Heute" button and label follow. The week page without `?week=` moves to the new current week.
- Unsaved input is kept: open dialogs, the command palette and the note editor are not touched. The "Arbeitszeit & Stundenkonto" form on `/settings` keeps typed values and takes values saved in another tab only while it has no unsaved changes. After "Speichern" it shows the stored (normalised) values.
- Not refreshed: the content of the open note, the todo archive, and values fixed when a component is set up (mini month today marker, default years, default start dates and ranges). The day changes only on return, not at midnight.
