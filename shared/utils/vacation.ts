import type { TargetSettings, DayEntry, DayInfo } from './target'
import { dayInfo } from './target'
import { format } from 'date-fns'
import type { IsoDate } from './time'
import { dateRange, addDays, daysBetween, toDate } from './time'

export type EntitlementKind = 'base' | 'extra' | 'carryover'

export interface VacationEntitlementRow {
  kind: EntitlementKind
  label: string
  /** In steps of 0.5 */
  days: number
  /** Start of the validity window; empty = 1 Jan of the entry's year */
  validFrom?: IsoDate | null
  /** End of the validity window; empty = 31 Dec of the entry's year */
  validUntil?: IsoDate | null
}

type WindowedEntitlement = Pick<VacationEntitlementRow, 'days' | 'validFrom' | 'validUntil'>

/** What a cross-year entry hands on to the next year: its remainder, with its effective window. */
export interface HandedOnEntitlement {
  fromYear: number
  label: string
  kind: EntitlementKind
  /** The remainder */
  days: number
  validFrom: IsoDate
  validUntil: IsoDate
}

export interface EntitlementUsage {
  used: number
  remaining: number
  forfeited: number
}

export interface VacationBalance {
  year: number
  /** Sum of all own entries plus the handed-on remainders */
  entitlement: number
  /** Vacation days up to and including today */
  taken: number
  /** Vacation days after today */
  planned: number
  /** Unused days of limited entries whose window ended in this year before today */
  forfeited: number
  /** entitlement - taken - planned - forfeited */
  carryover: number
  /** carryover without the unused days of every limited or handed-on entry */
  carryoverToNextYear: number
  /** Parallel to the input entries */
  entitlementUsage: EntitlementUsage[]
  /** Entries received from the previous year */
  handedOnEntitlements: (HandedOnEntitlement & EntitlementUsage)[]
  /** Own cross-year entries with days left after this year */
  passedToNextYear: HandedOnEntitlement[]
}

/** Effective window of an entry of `year`: an empty bound means the start/end of that year. */
export function effectiveVacationWindow(year: number, validFrom?: IsoDate | null, validUntil?: IsoDate | null): { from: IsoDate, until: IsoDate } {
  return { from: validFrom ?? `${year}-01-01`, until: validUntil ?? `${year}-12-31` }
}

const isLimited = (entitlement: WindowedEntitlement) => entitlement.validFrom != null || entitlement.validUntil != null

/** "gültig 01.04.–30.09." (both bounds in the shown year) or "gültig 01.10.2026–31.03.2027". */
export function vacationWindowText(validFrom: IsoDate | null | undefined, validUntil: IsoDate | null | undefined, shownYear: number): string {
  const { from, until } = effectiveVacationWindow(shownYear, validFrom, validUntil)
  const bothInShownYear = from.startsWith(`${shownYear}-`) && until.startsWith(`${shownYear}-`)
  const pattern = bothInShownYear ? 'dd.MM.' : 'dd.MM.yyyy'
  return `gültig ${format(toDate(from), pattern)}–${format(toDate(until), pattern)}`
}

/**
 * Seeded on first start - base entitlement 32 + two semester extra entries of 2 each.
 * Labels as before (2026: "WS 26/27", "SS 27"); changeable in the settings.
 */
export function vacationPrefill(year: number): VacationEntitlementRow[] {
  const short = (j: number) => String(j % 100).padStart(2, '0')
  return [
    { kind: 'base', label: 'Grundanspruch', days: 32 },
    { kind: 'extra', label: `Sonderurlaub WS ${short(year)}/${short(year + 1)}`, days: 2 },
    { kind: 'extra', label: `Sonderurlaub SS ${short(year + 1)}`, days: 2 },
  ]
}

/**
 * How many vacation days does a day consume? Vacation = 1, half vacation = 0.5 - but only on regular
 * workdays (vacation on weekends/holidays does not count).
 */
export function vacationDays(info: Pick<DayInfo, 'type' | 'isWorkday'>): number {
  if (!info.isWorkday) return 0
  if (info.type === 'vacation') return 1
  if (info.type === 'half_vacation') return 0.5
  return 0
}

/**
 * Assigns every vacation day to limited entries first (earliest window end first; on equal ends handed-on before own,
 * then input order); the rest comes from the general pool, which is not tracked here.
 * `vacationDaysByDate` holds the consumed days (1 or 0.5) per date; days are walked in date order.
 * Returns the used days per own entry and per handed-on entry, in input order.
 */
export function allocateVacationDays(
  year: number,
  entitlements: WindowedEntitlement[],
  handedOn: Pick<HandedOnEntitlement, 'days' | 'validFrom' | 'validUntil'>[],
  vacationDaysByDate: Record<IsoDate, number>,
): { usedOwn: number[], usedHandedOn: number[] } {
  interface Candidate { used: number, days: number, from: IsoDate, until: IsoDate, isHandedOn: boolean, order: number }
  const candidates: Candidate[] = [
    ...handedOn.map((entry, order) => ({ used: 0, days: entry.days, from: entry.validFrom, until: entry.validUntil, isHandedOn: true, order })),
    ...entitlements.flatMap((entry, order) => isLimited(entry)
      ? [{ used: 0, days: entry.days, isHandedOn: false, order, ...effectiveVacationWindow(year, entry.validFrom, entry.validUntil) }]
      : []),
  ]
  const priority = [...candidates].sort((left, right) =>
    left.until.localeCompare(right.until) || Number(right.isHandedOn) - Number(left.isHandedOn) || left.order - right.order)

  for (const date of Object.keys(vacationDaysByDate).sort()) {
    let rest = vacationDaysByDate[date]!
    for (const candidate of priority) {
      if (rest <= 0) break
      if (date < candidate.from || date > candidate.until) continue
      const taken = Math.min(rest, candidate.days - candidate.used)
      if (taken <= 0) continue
      candidate.used += taken
      rest -= taken
    }
  }

  const usedOwn = entitlements.map(() => 0)
  const usedHandedOn = handedOn.map(() => 0)
  for (const candidate of candidates) (candidate.isHandedOn ? usedHandedOn : usedOwn)[candidate.order] = candidate.used
  return { usedOwn, usedHandedOn }
}

/** A limited entry whose effective window ends after 31 Dec of `year` and that has days left hands them on to the next year. */
export function passesToNextYear(year: number, entry: WindowedEntitlement, remaining: number): boolean {
  return isLimited(entry) && effectiveVacationWindow(year, entry.validFrom, entry.validUntil).until > `${year}-12-31` && remaining > 0
}

/** Vacation balance of one year from entries, stored days and what the previous year handed on. */
export function vacationBalance(
  year: number,
  entitlements: (Pick<VacationEntitlementRow, 'days'> & Partial<Pick<VacationEntitlementRow, 'kind' | 'label' | 'validFrom' | 'validUntil'>>)[],
  days: Record<IsoDate, DayEntry>,
  today: IsoDate,
  settings: TargetSettings,
  handedOn: HandedOnEntitlement[] = [],
): VacationBalance {
  const yearEnd = `${year}-12-31`
  let taken = 0
  let planned = 0
  const vacationDaysByDate: Record<IsoDate, number> = {}
  for (const entry of Object.values(days)) {
    if (!entry.date.startsWith(`${year}-`)) continue
    const value = vacationDays(dayInfo(entry.date, entry, settings))
    if (value > 0) vacationDaysByDate[entry.date] = value
    if (entry.date <= today) taken += value
    else planned += value
  }

  const { usedOwn, usedHandedOn } = allocateVacationDays(year, entitlements, handedOn, vacationDaysByDate)
  // Forfeited only in the year the window ends; the window end of a cross-year entry lies after this year.
  const usageOf = (entry: WindowedEntitlement, used: number, windowEnd: IsoDate): EntitlementUsage => {
    const remaining = entry.days - used
    return { used, remaining, forfeited: isLimited(entry) && windowEnd <= yearEnd && windowEnd < today ? Math.max(remaining, 0) : 0 }
  }
  const entitlementUsage = entitlements.map((entry, index) =>
    usageOf(entry, usedOwn[index]!, effectiveVacationWindow(year, entry.validFrom, entry.validUntil).until))
  const handedOnEntitlements = handedOn.map((entry, index) => ({ ...entry, ...usageOf({ ...entry }, usedHandedOn[index]!, entry.validUntil) }))

  const forfeited = [...entitlementUsage.filter((_, index) => isLimited(entitlements[index]!)), ...handedOnEntitlements]
    .reduce((sum, usage) => sum + usage.forfeited, 0)
  const unusedLimited = [...entitlementUsage.filter((_, index) => isLimited(entitlements[index]!)), ...handedOnEntitlements]
    .reduce((sum, usage) => sum + (usage.forfeited > 0 ? 0 : Math.max(usage.remaining, 0)), 0)

  const entitlement = entitlements.reduce((sum, entry) => sum + entry.days, 0) + handedOn.reduce((sum, entry) => sum + entry.days, 0)
  const carryover = entitlement - taken - planned - forfeited

  const passedToNextYear: HandedOnEntitlement[] = entitlements.flatMap((entry, index) => {
    const remaining = entitlementUsage[index]!.remaining
    if (!passesToNextYear(year, entry, remaining)) return []
    if (entry.kind === undefined || entry.label === undefined) throw new Error('A vacation entitlement handed on to the next year needs a kind and a label')
    const { from, until } = effectiveVacationWindow(year, entry.validFrom, entry.validUntil)
    return [{ fromYear: year, label: entry.label, kind: entry.kind, days: remaining, validFrom: from, validUntil: until }]
  })

  return {
    year,
    entitlement,
    taken,
    planned,
    forfeited,
    carryover,
    carryoverToNextYear: carryover - unusedLimited,
    entitlementUsage,
    handedOnEntitlements,
    passedToNextYear,
  }
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
