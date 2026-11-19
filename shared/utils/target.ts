import { getHolidays } from 'feiertagejs'
import type { IsoDate } from './time'
import { weekday } from './time'

export type DayType = 'work' | 'vacation' | 'half_vacation' | 'sick' | 'flex_day'

/** Stored deviation of a day (day table). */
export interface DayEntry {
  date: IsoDate
  type: DayType
  targetOverride?: number | null
}

export interface TargetSettings {
  targetPerDayMin: number
  /** ISO weekdays 1 = Mon ... 7 = Sun */
  workdays: number[]
  federalState: string
}

export interface DayInfo {
  date: IsoDate
  target: number
  /** Regular workday by weekday, not a holiday */
  isWorkday: boolean
  /** Name of the holiday, if it is one */
  holiday?: string
  /** Stored day type (only effective on workdays) */
  type: DayType
}

type Region = Parameters<typeof getHolidays>[1]

const holidayCache = new Map<string, Map<IsoDate, string>>()

function holidaysInYear(year: number, federalState: string): Map<IsoDate, string> {
  const key = `${year}|${federalState}`
  let days = holidayCache.get(key)
  if (!days) {
    days = new Map(getHolidays(year, federalState as Region).map(h => [h.dateString, h.translate('de') ?? h.name]))
    holidayCache.set(key, days)
  }
  return days
}

export function holidayName(date: IsoDate, federalState: string): string | undefined {
  return holidaysInYear(Number(date.slice(0, 4)), federalState).get(date)
}

/**
 * Target of a day.
 * - Target override always wins.
 * - Weekend/holiday: 0, absences have no effect there.
 * - Workday: work/flex day = full target, half vacation = half, vacation/sick = 0.
 */
export function dayInfo(date: IsoDate, entry: DayEntry | undefined, settings: TargetSettings): DayInfo {
  const holiday = holidayName(date, settings.federalState)
  const isWorkday = !holiday && settings.workdays.includes(weekday(date))
  const type = entry?.type ?? 'work'

  let target = 0
  if (isWorkday) {
    switch (type) {
      case 'work':
      case 'flex_day':
        target = settings.targetPerDayMin
        break
      case 'half_vacation':
        target = Math.round(settings.targetPerDayMin / 2)
        break
      case 'vacation':
      case 'sick':
        target = 0
        break
    }
  }
  if (entry?.targetOverride != null) target = entry.targetOverride

  return { date, target, isWorkday, holiday, type }
}
