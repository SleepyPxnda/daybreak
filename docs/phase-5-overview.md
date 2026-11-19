# Phase 5 – Overview

Booked time grouped by account → task → days, and the history of the hours balance.

## Usage

### Overview (`/overview`)
- Switch the **range** at the top right: **Woche** (week), **Monat** (month, default) or **Frei** (custom).
  - Browse week/month with `‹ ›` (`?mode=week&date=<date>`; mode values `week`, `month`, `custom`, `month-closing`).
  - Custom: two date fields (`?mode=custom&from=…&to=…`), at most one year. When switching to "Frei", the range currently shown is adopted.
- **Total:** booked / target of the range with the difference (±).
- **Table account → task → days:** hours and share (percent + bar) per level.
  - Accounts are expanded, a click collapses them. A click on a task shows its days; "Alle Tage zeigen" expands everything.
  - Time booked directly onto the account is its own row **"ohne Aufgabe"** (without task).
  - Day rows show the block notes of the day and link to the day (the "Heute" page); "öffnen" leads to the task detail page.
- **Month closing** (fourth mode, `?mode=month-closing&date=<date>`, browse by month) – for transferring into the company tool, day by day:
  - Day row: date (link to the day), **start – end**, **break**, holiday/day type, day note, **actual / target**. Past workdays with a target but without a booking are marked "keine Buchung"; future days are dimmed.
  - Below that, one row per **account** with the total and the **keys** of the booked tasks (without a key: title; blocks without a task: block note).
  - At the top the month total (actual / target, ±, breaks), at the bottom the **month total per account**.
  - Weekends without bookings are hidden, holidays and absences stay visible.
  - Switch **h:mm / Dezimal**: all durations (break, actual/target, accounts, totals, balance) optionally in decimal hours (1:15 → 1,25, 2:30 → 2,5); start/end stay times. The choice is kept via the cookie `daybreak-month-closing-decimal`.
- On the right the **hours balance:** a line with the balance at the end of the month (hours), a tooltip with the state and the monthly delta; below that the months in descending order with delta and state. The running month is marked "laufend" (state up to yesterday).

## Business rules & decisions

Pure functions in `shared/utils/overview.ts` and `shared/utils/balance.ts` (tests: `tests/overview.test.ts`, `tests/balance.test.ts`).

- **Only booked work blocks** count (like the actual time); planned blocks and breaks do not appear.
- **Share** always refers to the level above: account of the range, task of the account, day of the task.
- **Sorting:** accounts in the saved account order (archived ones last), tasks by hours descending, days chronologically. Archived accounts and closed tasks stay included.
- **Block notes** are collected per day, trimmed and shown without duplicates.
- **Month closing** (`monthClosing`, an addition to the plan on request after phase 5): start = beginning of the first, end = end of the last *booked work block*. **Break = end − start − actual** – so break blocks *and* gaps together, so that start/end/break always add up exactly to the booked time. Label per block: task key → task title → block note, without duplicates per account and day. Accounts in the saved account order, also in "Monat je Konto".
- **Decimal hours** (`formatDecimal` in `shared/utils/time.ts`): German format with at most two decimal places, without trailing zeros (8:00 → 8, 0:20 → 0,33). On the 15-minute grid this is exact; `formatBalance` takes the format function as an optional second parameter.
- **Hours balance history** (`balanceHistory`): from the month of the start date to the running month; delta = Σ daily delta of the month (only days from the start date up to yesterday), state = balance at the end of the month. The state of the last month is identical to "Konto bis gestern" in the balance widget. If the start date is in the future, the history is empty.
- **Chart:** shadcn-vue `chart` (Unovis, new dependencies `@unovis/vue`, `@unovis/ts`), rendered on the client only (`<ClientOnly>`). The changes that `shadcn-vue add chart` wanted to make to `main.css` (Google Fonts import, base layer) were discarded – the font still comes locally via `@fontsource-variable/*`.
- **Refactoring:** loading actual times and day deviations for the hours balance now lives in `server/utils/balance.ts` (`loadBalanceInput`) and is shared by `/api/balance` and `/api/balance/history`; the query of booked work blocks (`loadBookedWork` in `server/utils/blockView.ts`) is shared by `/api/overview` and `/api/overview/month-closing`. The page is split into `components/overview/AccountTree.vue` and `MonthClosing.vue` so that only the active view loads. The unused `PagePlaceholder.vue` was removed.

## Data model & API

No schema change.

| Route | Purpose |
|---|---|
| `GET /api/overview?from&to` | `{ total, target, accounts: [{ accountId, name, color, minutes, share, tasks: [{ taskId \| null, key, title, minutes, share, days: [{ date, minutes, share, notes }] }] }] }` – range max. 1 year |
| `GET /api/overview/month-closing?from&to` | per day `{ date, target, start, end, actual, isBreak, type, holiday, isWorkday, note, accounts: [{ accountId, name, color, minutes, labels }] }` |
| `GET /api/balance/history` | `[{ month: 'YYYY-MM', delta, state, ongoing }]` since the start date of the hours balance |

## Open / known limits

- Not checked in the browser (chart display, tooltip, expand/collapse).
- The history always shows all months since the start date, independent of the selected range.
- No exports (plan: non-goal).
