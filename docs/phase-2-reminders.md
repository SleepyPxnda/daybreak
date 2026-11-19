# Phase 2 – Reminders, waiting for, daily topics, command palette

One entry type "todo" with three kinds, a global `Ctrl+K` palette with quick input and search.

## Usage

### Command palette – `Ctrl+K` / `⌘K` (from any page)
Also via "Schnelleingabe" at the top of the sidebar.
- **Run:** anything the quick input understands (book/plan time, breaks, reminders …). Enter runs an unambiguous action immediately and closes the palette.
- **Search:** text without a duration/prefix searches (from 2 characters) in tasks, accounts and open entries; arrow keys + Enter open the hit.
- **Go to:** all pages. The pages are filtered by their German titles (for example typing `Woche` lists the page that opens `/week`).
- On "Heute" the displayed day applies, otherwise today.

### Quick-input prefixes

| Input | Result |
|---|---|
| `t Zertifikat verlängern` | reminder |
| `t Zertifikat verlängern bis fr` | reminder with a due date |
| `d Deployment-Freeze ansprechen` | daily topic |
| `w Tim: PR-Review Login` | waiting for, *person* = text before the first `:` |
| `w Tim: PR-Review bis fr` / `bis 2026-10-02` | with a follow-up date |

**Acceptance:** a reminder is captured from any page with `Ctrl+K`, `t text`, Enter.

### Reminders & daily (`/todos`)
- Three lists: **Merker (reminders) · Warten auf (waiting for) · Daily-Themen (daily topics)**.
- A checkmark = done (for daily topics "besprochen", discussed), with "Rückgängig" (undo) in the toast.
- **Waiting for:** age ("seit 5 Tagen"); from the follow-up date on highlighted and on top. The alarm-clock button "nachgefasst" (followed up) sets the follow-up date to +3 workdays.
- Sort by drag and drop (handle on the left), input field at the end of the list (understands `Tim: … bis fr`), a click on an entry opens the edit dialog (kind, text, person, follow-up/due, link to task/account, delete).
- At the bottom a collapsible **"Besprochen / erledigt"** with date, reopen, delete.

### On "Heute"
- Cards below the timeline: **Merker** (all open), **Warten auf** (all open; due ones highlighted, on top and counted in the card header: "2 nachfassen"), **Daily-Themen**. All cards are always visible.
- **Drag a reminder onto the timeline** → a planned 30-minute block at the drop position, the reminder text as the block note. If the reminder has no link to a task/account, the prefilled block dialog opens for a choice. The reminder stays open.
- The task detail page shows the linked entries.

## Business rules & decisions

Pure functions in `shared/utils/todos.ts` and `quickInput.ts` (tests: `tests/todos.test.ts`, `tests/quickInput.test.ts`).

- **Due:** waiting for from `followUpDate`, reminders from `dueDate`, daily topics never.
- **Deviation from the plan:** on "Heute" the *waiting for* card shows all open entries instead of only the due ones (wish after phase 3).
- **Sorting:** due/overdue on top (oldest due date first), below that the manual order. New entries go to the end of their list.
- **Followed up:** +3 **workdays** (weekends and holidays per settings skipped).
- **Age:** calendar days since `createdAt` (local time zone).
- `bis <date>` works with `w` (follow-up) **and with `t` (due date)** – the plan names it only for `w`; with `d` "bis …" stays part of the text. `bis` with an invalid date also stays text.
- Fields that do not fit are dropped on the server (`person`/`followUpDate` only for waiting for, `dueDate` only for reminder).
- **Command palette:** its own search line via Reka's `ListboxFilter` instead of the shadcn `CommandInput` – its built-in text filter would have hidden action and search hits. The remaining parts are unchanged shadcn components (`CommandDialog`, `CommandList`, `CommandGroup`, `CommandItem`).
- Enter is intercepted for an unambiguous action and executed directly (independent of the highlighted entry, e.g. after pasting).
- Quick-input logic (parsing, preview, running) lives in the composable `useQuickInput` – used by the line on "Heute" and the palette.
- Sorting by drag and drop sets data on the drag event (otherwise Firefox does not start).

## Data model & API

Table `todo`: `kind` (`reminder` | `daily_topic` | `waiting_for`), `text`, `person`, `followUpDate`, `dueDate`, `taskId`, `accountId`, `sortOrder`, `doneAt`, `createdAt`. No migration needed (in the schema since phase 0).

| Route | Purpose |
|---|---|
| `GET /api/todos?kind&status=open\|done&taskId` | open (by sort order) or done (newest first) including the link |
| `POST /api/todos` | create (at the end of the list) |
| `PATCH /api/todos/:id` | change fields, `done: true/false` |
| `DELETE /api/todos/:id` | delete |
| `POST /api/todos/:id/followed-up` | new follow-up date (`to` or +3 workdays) |
| `POST /api/todos/reorder` | new order as an ID list |
| `GET /api/search?q` | tasks, accounts, open todos (`LIKE`, wildcards escaped) |

## Open / known limits

- Not checked in the browser (palette, drag and drop, acceptance "2 key presses + text").
- Search is case-insensitive only for ASCII letters (SQLite `LIKE`): "Übung" does not find "übung".
- ~~Notes in search and palette, the `n` prefix and pinned notes on "Heute"~~ → implemented in [phase 3](phase-3-notes.md).
- Only reminders (not waiting for/daily topics) can be dragged onto the timeline.
