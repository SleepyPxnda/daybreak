import type { BlockBasis } from './blocks'
import { actualMinutes } from './blocks'
import { formatDuration, formatTime } from './time'

export type BookingNotificationKind = 'gap' | 'end_of_day'

/** Second (and last) end-of-day notification this many minutes after the first time. */
const END_OF_DAY_FOLLOW_UP_MIN = 60

export interface BookingNotificationInput {
  /** Minutes since midnight */
  currentMinute: number
  targetMin: number
  blocks: Pick<BlockBasis, 'start' | 'end' | 'kind' | 'status'>[]
  workStart: number
  /** Notify after this many minutes without booked time - also the minimum spacing between two gap notifications */
  gapMin: number
  /** Time of day from which missing time against the target is notified */
  endOfDay: number
  /** Minute of the last notification per kind (today) */
  lastNotifiedMinute: Partial<Record<BookingNotificationKind, number>>
}

export interface BookingNotification {
  kind: BookingNotificationKind
  title: string
  text: string
}

/** Which notification is due now - at most one, otherwise null. Conditions resolve themselves by booking later. */
export function checkBookingNotification(e: BookingNotificationInput): BookingNotification | null {
  if (e.targetMin <= 0) return null
  const actual = actualMinutes(e.blocks)
  if (actual >= e.targetMin) return null

  if (e.currentMinute >= e.endOfDay) {
    const lastNotified = e.lastNotifiedMinute.end_of_day
    const followUp = e.endOfDay + END_OF_DAY_FOLLOW_UP_MIN
    const due = lastNotified === undefined || (lastNotified < followUp && e.currentMinute >= followUp)
    if (!due) return null
    return {
      kind: 'end_of_day',
      title: 'Tagesabschluss',
      text: `Heute ${formatDuration(actual)} von ${formatDuration(e.targetMin)} gebucht – Tagesabschluss machen?`,
    }
  }

  const bookedEnds = e.blocks.filter(b => b.status === 'gebucht').map(b => b.end)
  const since = Math.max(e.workStart, ...bookedEnds)
  if (e.currentMinute - since < e.gapMin) return null
  const lastNotified = e.lastNotifiedMinute.gap
  if (lastNotified !== undefined && e.currentMinute - lastNotified < e.gapMin) return null
  return {
    kind: 'gap',
    title: 'Zeit nachtragen',
    text: bookedEnds.length
      ? `Seit ${formatTime(since)} nichts gebucht – kurz nachtragen?`
      : 'Heute noch nichts gebucht – kurz nachtragen?',
  }
}
