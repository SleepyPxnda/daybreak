# Spec

What daybreak does today, per area. The phase documents describe how each area was built; later features are added below.

Code, API paths, page URLs, database names and stored values are English; only the UI text is German. The page URLs are listed in [README.md](README.md).

| Area | Document |
|---|---|
| Setup: Nuxt, theme, DB, Docker, CI | [phase-0-setup.md](phase-0-setup.md) |
| Time: timeline, quick input, hours balance, templates | [phase-1-time.md](phase-1-time.md) |
| Reminders, waiting-for, daily topics, command palette | [phase-2-reminders.md](phase-2-reminders.md) |
| Notes: plain text editor, kinds, tags, search, pinning | [phase-3-notes.md](phase-3-notes.md) |
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

## Notes: kinds and task notes

Superseding the Markdown parts of [phase-3-notes.md](phase-3-notes.md): note content is plain text and is shown and saved exactly as typed. There is no preview and no rendering anywhere; Markdown characters stay as typed text.

- **Kind:** a note can have a kind: Meeting, Problem or Info. Notes without a kind (for example older notes) show none active. A kind can be changed but not removed again. It is a label only, with no status such as open or resolved. Each kind has one tint everywhere (Meeting blue, Problem red, Info green, never amber) and is always shown with icon and label.
- **Editor:** one plain text field "Inhalt" across the full width, a kind control, and a link "Zur Aufgabe" next to "Bezug" for notes linked to a task. Autosave, `Strg+S`, tags, link, pinning and deletion work as before. Switching quickly between notes always shows the note in the URL.
- **Pinning** does not change "last changed" and does not move the note in the list; changing title, content, tags, kind or link does.
- **`/notes`:** entries show the kind marker and, for a note linked to a task with a key, the task key. A kind filter "Alle · Meetings · Probleme · Infos" next to the tag filter is kept in the URL as `?kind=meeting|problem|info` and combines with search and `?tag=`. With a kind filter active, `+` creates a note of that kind. Below the `lg` breakpoint the page shows either the list or, with `?id=`, the editor with "Zurück zur Liste"; `?tag=` and `?kind=` are kept, also on create and delete. "Heute → Notizen" shows the kind marker too.
- **Task page `/tasks/[id]`:** the "Notizen" card shows the linked notes in sections "Probleme", "Infos", "Meetings", then "Ohne Art" (only when such notes exist), each with a count and a rail in the kind's colour. Each kind section has a create button that creates a note of that kind, linked to the task and titled with the task title. An empty kind section shows "Noch keine Probleme." / "Noch keine Infos." / "Noch keine Meetings." The page looks the same for closed tasks. A row shows title, date of last change and excerpt; clicking it opens the full text read-only in place (several rows can be open), with a link "Bearbeiten" to `/notes?id=<id>`. Order within a section: pinned first, then most recently changed.
- **Quick input:** `nm <Titel>`, `np <Titel>` and `ni <Titel>` create a meeting, problem or info note. If the first word after the prefix is exactly a task key, the note is linked to that task and the rest is the title (`np GB-114 Cache läuft voll`); without further words the task title is used. `n <Titel>` is unchanged: no kind, no key match. The preview line names the kind and the task.
- **Deleting a task** keeps its notes: they lose the task link and are linked to the task's account. The delete dialog says so.
