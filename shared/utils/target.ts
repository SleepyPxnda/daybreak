import { getHolidays } from 'feiertagejs'
import type { IsoDate } from './time'
import { weekday } from './time'

export type DayType = 'arbeit' | 'urlaub' | 'halb_urlaub' | 'krank' | 'gleittag'

/** Stored deviation of a day (day table). */
export interface DayEntry {
  date: IsoDate
  type: DayType
  targetOverride?: number | null
}

export interface TargetSettings {
  sollProTagMin: number
  /** ISO weekdays 1 = Mon ... 7 = Sun */
  arbeitstage: number[]
  bundesland: string
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
  const holiday = holidayName(date, settings.bundesland)
  const isWorkday = !holiday && settings.arbeitstage.includes(weekday(date))
  const type = entry?.type ?? 'arbeit'

  let target = 0
  if (isWorkday) {
    switch (type) {
      case 'arbeit':
      case 'gleittag':
        target = settings.sollProTagMin
        break
      case 'halb_urlaub':
        target = Math.round(settings.sollProTagMin / 2)
        break
      case 'urlaub':
      case 'krank':
        target = 0
        break
    }
  }
  if (entry?.targetOverride != null) target = entry.targetOverride

  return { date, target, isWorkday, holiday, type }
}
