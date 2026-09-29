import { addDays, differenceInCalendarDays, format, getISODay, parseISO } from 'date-fns'

/** Datum als 'YYYY-MM-DD' (lokale Zeitzone, im Container Europe/Berlin). */
export type Datum = string

/** Zeitraster in Minuten. */
export const RASTER_MIN = 15
export const TAG_MIN = 24 * 60

const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/

export function istDatum(wert: string): wert is Datum {
  return DATUM_RE.test(wert) && !Number.isNaN(parseISO(wert).getTime())
}

export function zuDate(datum: Datum): Date {
  return parseISO(datum)
}

export function zuDatum(date: Date): Datum {
  return format(date, 'yyyy-MM-dd')
}

export function heute(): Datum {
  return zuDatum(new Date())
}

export function plusTage(datum: Datum, tage: number): Datum {
  return zuDatum(addDays(zuDate(datum), tage))
}

export function tageZwischen(von: Datum, bis: Datum): number {
  return differenceInCalendarDays(zuDate(bis), zuDate(von))
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export function wochentag(datum: Datum): number {
  return getISODay(zuDate(datum))
}

/** Alle Tage von `von` bis `bis` (beide inklusive). */
export function datumsBereich(von: Datum, bis: Datum): Datum[] {
  const tage: Datum[] = []
  for (let d = von; d <= bis; d = plusTage(d, 1)) tage.push(d)
  return tage
}

export function istImRaster(minuten: number): boolean {
  return Number.isInteger(minuten) && minuten % RASTER_MIN === 0
}

export function aufRaster(minuten: number): number {
  return Math.round(minuten / RASTER_MIN) * RASTER_MIN
}

/** 570 → '09:30' */
export function formatUhrzeit(minuten: number): string {
  const h = Math.floor(minuten / 60)
  const m = minuten % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** '09:30' / '9:30' → 570; undefined bei ungültiger Eingabe */
export function parseUhrzeit(text: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (min > 59 || h > 24 || (h === 24 && min > 0)) return undefined
  return h * 60 + min
}

/** 330 → '5:30', −30 → '-0:30' */
export function formatDauer(minuten: number): string {
  const abs = Math.abs(minuten)
  const text = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  return minuten < 0 ? `-${text}` : text
}

const DEZIMAL = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** Dauer in Dezimalstunden: 75 → '1,25', 150 → '2,5', 480 → '8', −30 → '-0,5' */
export function formatDezimal(minuten: number): string {
  return DEZIMAL.format(minuten / 60).replace('−', '-')
}

/** Saldo immer mit Vorzeichen (Plan §6: Plus/Minus nie nur über Farbe): '+3:15', '-0:30', '±0:00'. */
export function formatSaldo(minuten: number, format: (minuten: number) => string = formatDauer): string {
  if (minuten === 0) return `±${format(0)}`
  return minuten > 0 ? `+${format(minuten)}` : format(minuten)
}
