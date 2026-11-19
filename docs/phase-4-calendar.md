# Phase 4 – Calendar, vacation & week

Year calendar with absences, vacation account with variable entitlement entries, week planning.

## Usage

### Calendar (`/calendar`)
- **Year view** with 12 mini months, switch the year via `‹ 2026 ›` (`?year=2027`).
- **Colors:** vacation, half vacation (lighter), sick, flex day; **holidays** (federal state from the settings) outlined; weekends dimmed; a dot marks a deviating target; today bold and underlined. The tooltip shows weekday, holiday, type, deviating target and note.
- **Set the day type:** click a day or drag over several days (also across month boundaries). The bar at the top shows the range and the number of workdays – then choose **Urlaub** (vacation), **½ Urlaub** (half vacation), **Krank** (sick), **Gleittag** (flex day) or **Zurücksetzen** (reset). For a single day there is "Tag öffnen" (open day, → Heute). `Esc` clears the selection.
- On the right the **vacation card**: remaining days large, below that entitlement (expandable with all entries), taken, planned; "bearbeiten" (edit) leads to the settings (`/settings#vacation`).

### Blocker (addendum)
- Marks days on which you **should not take vacation** (release, trade fair, cover for someone …): **hatched red** in the calendar, tooltip "Blocker – kein Urlaub".
- Set like day types: select a range → **Blocker**. If all workdays of the selection are already blocked, the button reads **Blocker entfernen** (remove blocker). "Zurücksetzen" also removes the blocker.
- If a selection contains blocker days, the action bar warns ("2 Blocker-Tage – hier besser kein Urlaub"). Vacation can still be set – the day is then green **and** hatched, the conflict stays visible.

### Vacation entitlement (settings)
- Any number of **entries** per year: kind (base, extra, carryover), label, days (half days possible, negative for deductions). Changes are saved when leaving a field.
- **"Rest aus Vorjahr übernehmen"** (adopt carryover from the previous year) creates the previous year's remainder as an entry "Resturlaub <year>" or updates it (appears if the previous year has entries).
- **Prefill on first start** (current year): base entitlement 32, "Sonderurlaub WS 26/27" +2, "Sonderurlaub SS 27" +2 – 36 in total as in the plan.

### Next vacation on "Heute" (addendum)
- **Card "Nächster Urlaub"** below the timeline: range, "in 84 Tagen", number of vacation days. Without planned vacation, a link to the calendar.
- **Notice:** from *X days* before the start (settings → "Urlaubserinnerung (Tage vorher)", default 7) a highlighted hint above the timeline appears instead, with a countdown, remaining workdays and the **notice text** from the settings (default "Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.").
- During the vacation: "Im Urlaub bis …".
- **Confirm (addendum):** a planned vacation is unconfirmed at first. In the notice banner there is the button **"Bestätigt"** on the right – click it after the handover. After that the button and the notice text disappear, only the vacation note remains (countdown, range, number of vacation days, workdays before).

### Week (`/week`)
- Switch the calendar week with `‹ KW 40 ›` (`?week=<date>`), "Diese Woche" (this week) jumps back.
- **One timeline per day** (compact: no zoom bar, zooming with `Ctrl`+mouse wheel still works). All timeline actions as on "Heute": drag to create, move, drag the edges, right-click menu, click to edit.
- Per day: date (link to "Heute" for this day), holiday/day type, booked / target, planned, a hint about templates that were not entered.
- Header: **week total** booked / target with the difference (±) and planned.
- Show the **weekend** with a switch; if Sat/Sun have blocks or a target, it is shown automatically.
- On the right **tasks in progress** – dragging onto a day plans a 1-hour block (future planned, past booked).

## Business rules & decisions

Pure functions in `shared/utils/vacation.ts` (tests: `tests/vacation.test.ts`).

- **Vacation days:** vacation = 1, half vacation = 0.5 – only on regular workdays; vacation on weekends/holidays does not count.
- **taken** = vacation days up to and **including today**, **planned** = after that, **carryover** (the remainder) = entitlement − taken − planned (can become negative).
- **Prefill** runs exactly once (a flag in `settings`) and only if no entries exist at all – deleted entries do not come back. Labels word for word as in the plan.
- **Next vacation** (`nextVacation`): consecutive vacation days (half days too) form a range; weekends/holidays in between bridge it, a workday without vacation ends it. If today is a day off in the middle of a vacation, the vacation counts as running. Sick and flex day do not count. "Workdays before" counts regular workdays between today and the start (both exclusive). Search horizon 1 year. An addition to the plan (wish after phase 4).
- **Adopt carryover** replaces an existing carryover entry of the year (rounded to half days).
- **Set a range:** absences are stored only on regular workdays (weekends/holidays stay clean). "Zurücksetzen" deletes entries without a target override/note and sets the others to workday – override and note are kept.
- **Blocker** (an addition to the plan) is its own flag `day.blocker`, **not a day type**: it changes neither the target nor the vacation count and can be combined with vacation/sick/flex day so that conflicts stay visible instead of silently overwriting the blocker. Stored only on regular workdays. A day with a blocker counts as a deviation and is not deleted – not even when the day type is set back to work on "Heute"; removing is possible only in the calendar. Hatched red via the utility `blocker-hatched` (token `--destructive`).
- **Confirmation** (addendum) is a flag `day.confirmed` on the vacation days. A vacation counts as confirmed if **all** its (half) vacation days are confirmed – if a day is added later, the button reappears. If the day type of a day changes (calendar or "Heute"), its confirmation is discarded; setting the same type again keeps it. During the vacation there is no button. In the calendar, unconfirmed (half) vacation days have a dashed outline with a light fill (tooltip "unbestätigt"), confirmed ones are solid as before; confirming is possible only on "Heute".
- **Not implemented (optional in the plan):** a template for recurring extra entries (semester days) – entries are maintained manually per year.
- **Refactoring:** the timeline actions (create, change, menu, drop of tasks/reminders, dialog state) now live in the composable `useBlockEditing` and are shared by Heute and Woche; the current minute in `useCurrentMinute`.

## Data model & API

Tables `vacation_entitlement` (`year`, `kind`, `label`, `days`) and `day` – both in the schema since phase 0, no migration.

| Route | Purpose |
|---|---|
| `GET /api/vacation?year` | account (`entitlement`, `taken`, `planned`, `carryover`), `entitlements`, `previousYearCarryover`; creates the prefill on the first call |
| `POST /api/vacation/entitlements`, `PATCH/DELETE /api/vacation/entitlements/:id` | maintain entries (days in 0.5 steps) |
| `POST /api/vacation/carry-over` | `{ year }` → carryover entry from the previous year |
| `GET /api/vacation/next` | next/running vacation (including `confirmed`), `notify` (within the lead time), the notice text |
| `POST /api/vacation/confirm` | `{ from, to }` – mark all vacation days in the range as confirmed (migration `0003_tag_bestaetigt`) |
| `PUT /api/days/range` | `{ from, to, type }` – day type for a range (max. 1 year) – or `{ from, to, blocker: true \| false }` |
| `GET /api/days?from&to` | now additionally returns `targetOverride`, `blocker` and `confirmed` |

Migration `0002_tag_blocker`: column `day.blocker` (boolean, default `false`; the table was called `tag` then).

## Open / known limits

- Not checked in the browser (range selection by dragging, week planning).
- A target override and a day note are still set only day by day via "Heute" (day type popover), not in the calendar.
- The range selection in the calendar works with mouse/pen; on touch devices only by tapping single days.
