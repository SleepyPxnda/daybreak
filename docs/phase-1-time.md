# Phase 1 – Time (core)

Accounts & tasks, timeline, quick input for time, hours balance, day closing, recurring blocks.

## Usage

### Accounts & tasks (`/accounts`)
- On the left the accounts (color, aliases for quick input, archiving in the edit dialog; "Archivierte zeigen" shows them).
- The active accounts can be sorted by drag and drop at the grip handle (a dashed slot shows the landing position). The saved order (`account.sortOrder`) applies everywhere accounts are listed. New and reactivated accounts go to the end of the active ones; archived accounts always come last, sorted by name.
- On the right the tasks of the selected account with key, title, status, estimate, booked time. A click opens the detail page. A specific account can be opened directly with `?accountId=<id>`.
- **Task detail** (`/tasks/:id`): sum booked/planned, progress against the estimate, all blocks by day (a click on the day opens it on "Heute"). Edit (including switching the account – blocks and templates move along), close/reopen, delete only without blocks.
- Accounts with tasks, blocks or templates cannot be deleted – only archived.

### Today (`/`)
- **Header:** `‹ Tag ›` to browse (fixed text block so the arrows do not jump), a "Heute" button to go back. Other days via `?date=YYYY-MM-DD`. On the right the **day type** (workday, vacation, half vacation, sick, flex day, optionally a deviating target and a note) and the **balance widget** "Konto bis gestern: +3:15 · heute: 5:30 / 8:00" (balance up to yesterday · today: actual / target).
- **Timeline** (full width):

  | Action | How |
  |---|---|
  | create a block | drag on an empty area → dialog (task/account, break, planned/booked, note) |
  | move / change duration | drag the block / drag the edges |
  | edit | click the block |
  | menu | right click: book ↔ planned, split here, change task/account, save as recurring, delete |
  | zoom | `Ctrl`/`⌘`+mouse wheel or pinch, buttons `−` `+` `↺` |
  | move the view | scroll horizontally, `Shift`+mouse wheel, drag with the middle mouse button |
  | schedule a task | drag from "Aufgaben in Arbeit" (tasks in progress) onto the timeline → 1-hour block |

  Everything snaps to the 15-minute grid. Overlaps are marked red while dragging and are not saved. Planned blocks are hatched, breaks gray; the now line shows the current time.
- Below that the progress "Gebucht x / Soll" (booked x / target) with "geplant" (planned), the **quick input** and the buttons **Wie gestern** (copy yesterday) and **Tagesabschluss** (day closing).
- **Cards below the timeline:** tasks in progress (as well as reminders, waiting-for and daily topics from phase 2 and pinned notes from phase 3).

### Quick input (time)

| Input | Result |
|---|---|
| `2h PROJ-123 Review` | booked, 2 h on task PROJ-123, note "Review", next free slot |
| `2h login` | fuzzy match on open task titles |
| `2h Neue Idee @apollo` | no match in the account → creates the task "Neue Idee" in Apollo and books |
| `1h @wartung` | directly onto the account |
| `9:00-10:30 mtg` | fixed time, account via the alias `mtg` |
| `p 30m` | break |
| `plan 5h PROJ-123 morgen` | planned for tomorrow (`mo`…`so`, `heute`, `gestern`, `übermorgen`, `2026-10-01`) |

Durations: `2h`, `1.5h`, `1,5h`, `1h30`, `45m`, `90m`, `30min`. Time ranges: `9:00-10:30`, `9-10`. Live preview below the line, Enter confirms, Esc clears. Several matches → selection buttons.

### Day closing & "Wie gestern"
- **Day closing** (sheet): gap to the target, adopt planned blocks one by one or all ("übernehmen" → booked), quick booking: enter a duration (prefilled with the gap) and click the chip of a recently booked task/account.
- **Wie gestern** (copy yesterday): copies the booked blocks of the last day with bookings (at most 7 days back) as *planned*; occupied time ranges are skipped.

### Settings (`/settings`)
- Target per day, workdays, federal state (holidays), work start (for the "next free slot"), visible timeline range, hours balance start date and start balance.
- **Recurring blocks (templates):** name (optional, e.g. "Daily" – then shown on the timeline), assignment, time, weekdays, rhythm (every 1st–4th week), valid from/until. Archiving instead of an active switch; archived ones sit collapsed under "Archiviert" (restore/delete permanently).
- Alternatively in the block menu "Als wiederkehrend speichern …" (links the original block with the new template).
- The vacation entitlement card has the anchor `/settings#vacation`.

## Business rules & decisions

Pure functions in `shared/utils/` with tests in `tests/`.

### Target (`target.ts`)
| Day | Target |
|---|---|
| workday | `targetPerDayMin` (480) |
| weekend / holiday (feiertagejs, federal state from settings) | 0 |
| vacation, sick | 0 |
| half vacation | half the daily target |
| flex day | full target (actual 0 → minus) |

- **A target override always wins**, also on a weekend/holiday.
- Absences on weekends/holidays have no effect.

### Hours balance (`balance.ts`)
`balance = start balance + Σ (actual − target)` from the start date to **yesterday**. Today is shown separately and live, the future never counts. Actual = booked work blocks (planned ones and breaks do not count). The start date is set to the current day when the settings are first loaded.

### Blocks (`blocks.ts`)
- 15-minute grid, start < end, within 0–24 h, **no overlap** (client and server).
- Work needs an account; with a task the account comes from the task (enforced by the server).
- **Next free slot:** after the last block of the day (planned ones too), otherwise the work start.
- New blocks via drag/drop: booked if the range is in the past, otherwise planned.

### Templates (`templates.ts`)
- Materialization when a range is loaded (`GET /api/blocks`), at most up to today + 14 days.
- Applies if active, inside the validity range, matching weekday, rhythm: weeks since the week of "valid from" `% n == 0`.
- Only on regular workdays with type work or **half vacation** (decision: on half-vacation days the daily is entered anyway); not on vacation, sick, flex day.
- Never twice: unique index `(templateId, date)`; deleted single occurrences → `template_exception`. If a template occurrence is moved to another day, it becomes a normal block and the old day counts as skipped.
- Occupied time range → no block, but a hint badge "… nicht eingetragen – Zeitraum belegt" (not entered – time range occupied).
- Changing/archiving a template deletes future (> today) occurrences that are still planned; they are generated again. Booked and past ones stay.

### Quick-input parser (`quickInput.ts`)
- **Order:** prefix (`p`, `plan`) → duration/time directly after it → date as the **last** word.
- **Assignment detection:** exact task key (closed ones too) → account alias → fuzzy on open task titles (longest matching word start, the rest = note) → fuzzy on active account names.
- **With `@account`:** the **whole** rest must match a task of the account, otherwise a new task (prevents "Neue Idee" from booking onto any task containing "neue"). `2h @apollo` books onto the account.
- **Weekdays:** with `plan` forward (next occurrence after today), when booking backward (last one up to today). Booked in the future is an error.
- Without a date, the displayed day applies (`defaultDate`), relative statements stay relative to today.

### Tasks in progress
Open tasks with a booking in the last 14 days **or** a plan on the day **or created in the last 14 days** (an extension to the plan so that new tasks can be dragged onto the timeline right away).

### Further technical decisions
- Editing a block in a **dialog** instead of a popover.
- Mutations via `app/utils/api.ts` (untyped `$fetch`): Nitro's route type inference runs into "Excessive stack depth" on dynamic URLs.
- Timeline zoom calculation as pure functions in `app/utils/timeline.ts` (tested); the zoom state is not saved.

### Fix: long task titles (after phase 5)
Long titles (also without spaces) widened dialogs and tables. Rule now: **lists, chips and select fields truncate** (`truncate`, full title as a tooltip), **headings and running text wrap** (`wrap-anywhere`).
- `AssignmentPicker` (block, template, reminder and note dialog): value in the trigger with `truncate` + `contain-inline-size` so it does not stretch the dialog; dropdown at most 36rem wide, entries truncated.
- Accounts table: the title column wraps (instead of the `whitespace-nowrap` of the shadcn cell); account name in the header truncated.
- Task detail page: the heading wraps, buttons stay beside it.
- Command palette, quick-input matches, day-closing chips and planned blocks, reminder reference, "tasks in progress": truncated with a tooltip.
- **Cause of "text disappears hard behind the card edge":** a `grid` without explicit columns has an `auto` column that takes non-wrapping text at full width – the card then clips, and the ellipsis and the right column (hours) are missing. Rule: grids with single-line texts get **`grid-cols-1`** (= `minmax(0, 1fr)`), set on page columns, card contents, the todo list, day closing, overview.
- **Soft fade-out:** the utility `fade-end` (`main.css`) fades titles that are too long out on the right with a mask instead of "…" – only on elements that fill the row (tasks in progress, pinned notes, planned blocks in the day closing, notes of the task). Narrow elements (chips, palette) keep the ellipsis, otherwise short text would fade at the end too.
- "Tasks in progress": the drag handle sits in the card padding and no longer takes space on the left.

## Data model & API

Tables: `account`, `task`, `block` (+ `templateId`), `template` (+ `name`, migration `0001`), `template_exception`, `day`, `settings`.

| Route | Purpose |
|---|---|
| `GET/PUT /api/settings` | settings (with defaults) |
| `GET/POST /api/accounts`, `PATCH/DELETE /api/accounts/:id` | accounts; aliases must be unique; list in the saved order |
| `POST /api/accounts/reorder` | new order of the active accounts (`{ ids }`, exactly all active ids) |
| `GET /api/tasks?accountId&status&activeOn=<date>` | tasks including `bookedMin`/`plannedMin` |
| `GET/PATCH/DELETE /api/tasks/:id`, `POST /api/tasks` | detail with blocks; key unique (409) |
| `GET /api/blocks?from&to` | blocks with display info; materializes templates, returns `conflicts` |
| `POST /api/blocks` | with `start`+`end` **or** `duration` (→ next free slot) |
| `PATCH/DELETE /api/blocks/:id`, `POST /api/blocks/:id/split` | overlap → 409 |
| `POST /api/blocks/book-planned` | planned blocks of a day (or `ids`) → booked |
| `POST /api/blocks/copy-yesterday`, `GET /api/blocks/recent?date` | copy yesterday, day-closing suggestions |
| `GET /api/days?from&to`, `PUT /api/days/:date` | day info; only deviations are stored |
| `GET/POST /api/templates`, `PATCH/DELETE /api/templates/:id` | templates |
| `GET /api/balance?today` | balance up to yesterday + actual/target/planned today |

Tests: `time`, `target`, `balance`, `blocks`, `templates` (acceptance "Daily Mon–Fri"), `quickInput`, `timelineView`.

## Open / known limits

- The acceptance "book a day in < 1 min via quick input" is built but not measured in the browser.
- The API was not tested live with curl, only via typecheck and unit tests of the business logic.
- The overlap check on the server runs outside a transaction (single user, so not critical).
- Templates also materialize for past days in the loaded range (from "valid from").
