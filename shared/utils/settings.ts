import { z } from 'zod'
import { isIsoDate, GRID_MIN, DAY_MIN } from './time'

export const dateSchema = z.string().refine(isIsoDate, 'Datum im Format YYYY-MM-DD erwartet')

/** Minutes since midnight on the 15-minute grid (0 ... 1440) */
export const timeSchema = z.number().int().min(0).max(DAY_MIN).multipleOf(GRID_MIN)

export const FEDERAL_STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HE', 'HH', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const

export const settingsSchema = z.object({
  targetPerDayMin: z.number().int().min(0).max(DAY_MIN),
  workdays: z.array(z.number().int().min(1).max(7)),
  federalState: z.enum(FEDERAL_STATES),
  /** Start for "next free slot" */
  workStart: timeSchema,
  /** Visible range of the timeline */
  timelineFrom: timeSchema,
  timelineTo: timeSchema,
  balanceStart: z.object({
    date: dateSchema,
    balanceMin: z.number().int(),
  }),
  /** From this many days before vacation start the reminder appears on "Today" */
  vacationNoticeDays: z.number().int().min(0).max(90),
  /** Text of the vacation reminder */
  vacationNoticeText: z.string().trim().max(300),
  /** Browser notifications for missing bookings (only while a Daybreak tab is open) */
  bookingNotificationsEnabled: z.boolean(),
  /** Notify after this many minutes without booked time */
  bookingNotificationGapMin: z.number().int().min(30).max(480).multipleOf(15),
  /** From this time of day notify about missing time against the target */
  bookingNotificationEndOfDay: timeSchema,
})

export type Settings = z.infer<typeof settingsSchema>

/** Defaults; the balance start date is set to "today" on first load. */
export const DEFAULT_SETTINGS: Omit<Settings, 'balanceStart'> = {
  targetPerDayMin: 480,
  workdays: [1, 2, 3, 4, 5],
  federalState: 'BW',
  workStart: 480,
  timelineFrom: 420,
  timelineTo: 1140,
  vacationNoticeDays: 7,
  vacationNoticeText: 'Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.',
  bookingNotificationsEnabled: false,
  bookingNotificationGapMin: 120,
  bookingNotificationEndOfDay: 990,
}
