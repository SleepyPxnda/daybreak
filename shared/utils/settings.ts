import { z } from 'zod'
import { isIsoDate, GRID_MIN, DAY_MIN } from './time'

export const dateSchema = z.string().refine(isIsoDate, 'Datum im Format YYYY-MM-DD erwartet')

/** Minutes since midnight on the 15-minute grid (0 ... 1440) */
export const timeSchema = z.number().int().min(0).max(DAY_MIN).multipleOf(GRID_MIN)

export const FEDERAL_STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HE', 'HH', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const

export const settingsSchema = z.object({
  sollProTagMin: z.number().int().min(0).max(DAY_MIN),
  arbeitstage: z.array(z.number().int().min(1).max(7)),
  bundesland: z.enum(FEDERAL_STATES),
  /** Start for "next free slot" */
  arbeitsbeginn: timeSchema,
  /** Visible range of the timeline */
  timelineVon: timeSchema,
  timelineBis: timeSchema,
  stundenkontoStart: z.object({
    datum: dateSchema,
    saldoMin: z.number().int(),
  }),
  /** From this many days before vacation start the reminder appears on "Today" */
  urlaubErinnerungTage: z.number().int().min(0).max(90),
  /** Text of the vacation reminder */
  urlaubErinnerungText: z.string().trim().max(300),
  /** Browser notifications for missing bookings (only while a Daybreak tab is open) */
  erinnerungenAktiv: z.boolean(),
  /** Notify after this many minutes without booked time */
  erinnerungLueckeMin: z.number().int().min(30).max(480).multipleOf(15),
  /** From this time of day notify about missing time against the target */
  erinnerungFeierabend: timeSchema,
})

export type Settings = z.infer<typeof settingsSchema>

/** Defaults; the balance start date is set to "today" on first load. */
export const DEFAULT_SETTINGS: Omit<Settings, 'stundenkontoStart'> = {
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
