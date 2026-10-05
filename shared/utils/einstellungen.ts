import { z } from 'zod'
import { istDatum, RASTER_MIN, TAG_MIN } from './zeit'

export const datumSchema = z.string().refine(istDatum, 'Datum im Format YYYY-MM-DD erwartet')

/** Minuten seit Mitternacht im 15-min-Raster (0 … 1440) */
export const uhrzeitSchema = z.number().int().min(0).max(TAG_MIN).multipleOf(RASTER_MIN)

export const BUNDESLAENDER = ['BW', 'BY', 'BE', 'BB', 'HB', 'HE', 'HH', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const

export const einstellungenSchema = z.object({
  sollProTagMin: z.number().int().min(0).max(TAG_MIN),
  arbeitstage: z.array(z.number().int().min(1).max(7)),
  bundesland: z.enum(BUNDESLAENDER),
  /** Beginn für „nächster freier Slot“ */
  arbeitsbeginn: uhrzeitSchema,
  /** Sichtbarer Bereich der Timeline */
  timelineVon: uhrzeitSchema,
  timelineBis: uhrzeitSchema,
  stundenkontoStart: z.object({
    datum: datumSchema,
    saldoMin: z.number().int(),
  }),
  /** Ab so vielen Tagen vor Urlaubsbeginn erscheint die Erinnerung auf „Heute“ */
  urlaubErinnerungTage: z.number().int().min(0).max(90),
  /** Text der Urlaubserinnerung */
  urlaubErinnerungText: z.string().trim().max(300),
  /** Browser-Benachrichtigungen bei fehlender Buchung (nur solange ein Daybreak-Tab offen ist) */
  erinnerungenAktiv: z.boolean(),
  /** Nach so vielen Minuten ohne gebuchte Zeit erinnern */
  erinnerungLueckeMin: z.number().int().min(30).max(480).multipleOf(15),
  /** Ab dieser Uhrzeit an fehlende Zeit zum Soll erinnern */
  erinnerungFeierabend: uhrzeitSchema,
})

export type Einstellungen = z.infer<typeof einstellungenSchema>

/** Defaults laut Plan §4; stundenkontoStart.datum wird beim ersten Laden auf „heute“ gesetzt. */
export const STANDARD_EINSTELLUNGEN: Omit<Einstellungen, 'stundenkontoStart'> = {
  sollProTagMin: 480,
  arbeitstage: [1, 2, 3, 4, 5],
  bundesland: 'BW',
  arbeitsbeginn: 480,
  timelineVon: 420,
  timelineBis: 1140,
  urlaubErinnerungTage: 7,
  urlaubErinnerungText: 'Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.',
  erinnerungenAktiv: false,
  erinnerungLueckeMin: 120,
  erinnerungFeierabend: 990,
}
