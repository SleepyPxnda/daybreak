# Changelog

## Unreleased

- Accounts can be sorted by drag and drop on `/accounts`; the saved order applies everywhere accounts are listed, including the overview and the month closing (archived accounts last). Adds a migration (`account.sort_order`).
- **Breaking: all code names are English now** (the UI stays German). Back up your database file (`data/daybreak.db`) before upgrading.
  - **Database:** two migrations rename tables, columns and stored values to English and rewrite the settings keys. They run automatically at startup and are one-way: a migrated database does not work with an older image.
  - **API paths** changed (for example `/api/konten` → `/api/accounts`, `/api/aufgaben` → `/api/tasks`, `/api/saldo` → `/api/balance`, `/api/uebersicht` → `/api/overview`, `/api/notizen` → `/api/notes`, `/api/vorlagen` → `/api/templates`, `/api/urlaub` → `/api/vacation`, `/api/tage` → `/api/days`, `/api/suche` → `/api/search`); query parameters and JSON fields are English too. See `docs/` for the current routes.
  - **Page URLs** changed. The old URLs are not redirected, so **bookmarks need to be set again**:

    | Old URL | New URL |
    |---|---|
    | `/woche` | `/week` |
    | `/uebersicht` | `/overview` |
    | `/kalender` | `/calendar` |
    | `/notizen` | `/notes` |
    | `/konten` | `/accounts` |
    | `/aufgaben/<id>` | `/tasks/<id>` |
    | `/einstellungen` (`#urlaub`) | `/settings` (`#vacation`) |

    `/` and `/todos` stay. Page query parameters changed as well: `?datum` → `?date`, `?abschluss=1` → `?dayClosing=1`, `?woche` → `?week`, `?modus=monat|woche|frei|abschluss` → `?mode=month|week|custom|month-closing`, `?von`/`?bis` → `?from`/`?to`, `?jahr` → `?year`, `?konto` → `?accountId`.
  - **Browser preferences reset once:** the state of the booking notifications (which reminders were already shown today) and the decimal-hours toggle of the month closing. Set the toggle again if you use it.
- Project docs: `docs/ARCHITECTURE.md`, `docs/SPEC.md`, conventions in `CLAUDE.md`; implementation plan removed from the repo. The README and all docs are in English now (the UI stays German).
