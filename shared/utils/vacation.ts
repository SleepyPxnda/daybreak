import type { TargetSettings, DayEntry, DayInfo } from './target'
import { dayInfo } from './target'
import type { IsoDate } from './time'
import { dateRange, addDays, daysBetween } from './time'

export type EntitlementKind = 'grund' | 'zusatz' | 'rest'

export interface VacationEntitlementRow {
  kind: EntitlementKind
  label: string
  /** In steps of 0.5 */
  days: number
}

export interface VacationBalance {
  year: number
  /** Sum of all entries */
  entitlement: number
  /** Vacation days up to and including today */
  taken: number
  /** Vacation days after today */
  planned: number
  /** entitlement - taken - planned */
  carryover: number
}

/**
 * Seeded on first start - base entitlement 32 + two semester extra entries of 2 each.
 * Labels as before (2026: "WS 26/27", "SS 27"); changeable in the settings.
 */
export function vacationPrefill(year: number): VacationEntitlementRow[] {
  const short = (j: number) => String(j % 100).padStart(2, '0')
  return [
    { kind: 'grund', label: 'Grundanspruch', days: 32 },
    { kind: 'zusatz', label: `Sonderurlaub WS ${short(year)}/${short(year + 1)}`, days: 2 },
    { kind: 'zusatz', label: `Sonderurlaub SS ${short(year + 1)}`, days: 2 },
  ]
}

/**
 * How many vacation days does a day consume? Vacation = 1, half vacation = 0.5 - but only on regular
 * workdays (vacation on weekends/holidays does not count).
 */
export function vacationDays(info: Pick<DayInfo, 'type' | 'isWorkday'>): number {
  if (!info.isWorkday) return 0
  if (info.type === 'urlaub') return 1
  if (info.type === 'halb_urlaub') return 0.5
  return 0
}

/** Vacation balance of one year from entries and stored days. */
export function vacationBalance(
  year: number,
  entitlements: Pick<VacationEntitlementRow, 'days'>[],
  days: Record<IsoDate, DayEntry>,
  today: IsoDate,
  settings: TargetSettings,
): VacationBalance {
  const entitlement = entitlements.reduce((sum, p) => sum + p.days, 0)
  let taken = 0
  let planned = 0
  for (const entry of Object.values(days)) {
    if (!entry.date.startsWith(`${year}-`)) continue
    const value = vacationDays(dayInfo(entry.date, entry, settings))
    if (entry.date <= today) taken += value
    else planned += value
  }
  return { year, entitlement, taken, planned, carryover: entitlement - taken - planned }
}

export interface NextVacation {
  /** First and last vacation day of the contiguous range */
  from: IsoDate
  to: IsoDate
  /** Consumed vacation days in the range (half vacation = 0.5) */
  vacationDays: number
  /** Calendar days until the start (0 = today or ongoing) */
  daysUntil: number
  /** Regular workdays between today (exclusive) and the start (exclusive) */
  workdaysTo: number
  /** Today lies within the range */
  running: boolean
}

/**
 * Next (or ongoing) vacation from today. Consecutive vacation days form a range;
 * weekends/holidays in between bridge it, workdays without vacation end it.
 * @param maxDays Search horizon
 */
export function nextVacation(
  today: IsoDate,
  days: Record<IsoDate, DayEntry>,
  settings: TargetSettings,
  maxDays = 366,
): NextVacation | null {
  const to = addDays(today, maxDays)
  const infoFrom = (d: IsoDate) => dayInfo(d, days[d], settings)
  const isVacation = (d: IsoDate) => vacationDays(infoFrom(d)) > 0

  // Start: first vacation day from today - if today is in the middle of a vacation, go back to its beginning
  let start: IsoDate | undefined
  for (let d = today; d <= to; d = addDays(d, 1)) {
    if (isVacation(d)) {
      start = d
      break
    }
  }
  if (!start) return null

  // If only free days lie between today and the start (e.g. today = Saturday in the middle of a vacation),
  // today may belong to a vacation that began earlier -> extend the start backward.
  const onlyFreeDays = dateRange(today, addDays(start, -1)).every(d => !infoFrom(d).isWorkday)
  if (onlyFreeDays) {
    let d = addDays(today, -1)
    for (let i = 0; i < maxDays; i++, d = addDays(d, -1)) {
      if (isVacation(d)) start = d
      else if (infoFrom(d).isWorkday) break
    }
  }

  // End: continue while vacation or free days follow; the last vacation day counts
  let end = start
  let sum = 0
  for (let d = start; d <= to; d = addDays(d, 1)) {
    const info = infoFrom(d)
    const value = vacationDays(info)
    if (value > 0) {
      end = d
      sum += value
    }
    else if (info.isWorkday) {
      break
    }
  }

  const running = start <= today && today <= end
  let workdaysTo = 0
  if (!running) {
    for (let d = addDays(today, 1); d < start; d = addDays(d, 1)) {
      if (infoFrom(d).isWorkday) workdaysTo++
    }
  }
  return { from: start, to: end, vacationDays: sum, daysUntil: running ? 0 : daysBetween(today, start), workdaysTo, running }
}

/** All days of a year ('YYYY-01-01' ... 'YYYY-12-31'). */
export function yearDays(year: number): IsoDate[] {
  return dateRange(`${year}-01-01`, `${year}-12-31`)
}
