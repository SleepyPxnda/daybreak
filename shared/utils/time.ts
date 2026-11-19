import { addDays as addDaysToDate, differenceInCalendarDays, format, getISODay, parseISO } from 'date-fns'

/** Date as 'YYYY-MM-DD' (local time zone, Europe/Berlin in the container). */
export type IsoDate = string

/** Time grid in minutes. */
export const GRID_MIN = 15
export const DAY_MIN = 24 * 60

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(parseISO(value).getTime())
}

export function toDate(date: IsoDate): Date {
  return parseISO(date)
}

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd')
}

export function today(): IsoDate {
  return toIsoDate(new Date())
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIsoDate(addDaysToDate(toDate(date), days))
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return differenceInCalendarDays(toDate(to), toDate(from))
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function weekday(date: IsoDate): number {
  return getISODay(toDate(date))
}

/** All days from `from` to `to` (both inclusive). */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export function isOnGrid(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes % GRID_MIN === 0
}

export function snapToGrid(minutes: number): number {
  return Math.round(minutes / GRID_MIN) * GRID_MIN
}

/** 570 → '09:30' */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** '09:30' / '9:30' -> 570; undefined for invalid input */
export function parseTime(text: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (min > 59 || h > 24 || (h === 24 && min > 0)) return undefined
  return h * 60 + min
}

/** 330 → '5:30', −30 → '-0:30' */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes)
  const text = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  return minutes < 0 ? `-${text}` : text
}

const DECIMAL_FORMAT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** Duration in decimal hours: 75 -> '1,25', 150 -> '2,5', 480 -> '8', -30 -> '-0,5' */
export function formatDecimal(minutes: number): string {
  return DECIMAL_FORMAT.format(minutes / 60).replace('−', '-')
}

/** Balance always with sign (plus/minus never only via color): '+3:15', '-0:30', '±0:00'. */
export function formatBalance(minutes: number, format: (minutes: number) => string = formatDuration): string {
  if (minutes === 0) return `±${format(0)}`
  return minutes > 0 ? `+${format(minutes)}` : format(minutes)
}
