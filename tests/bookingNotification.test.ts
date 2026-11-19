import { describe, expect, it } from 'vitest'
import { checkBookingNotification } from '../shared/utils/bookingNotification'
import type { BookingNotificationInput } from '../shared/utils/bookingNotification'

const booked = (start: number, end: number) => ({ start, end, kind: 'arbeit' as const, status: 'gebucht' as const })
const planned = (start: number, end: number) => ({ start, end, kind: 'arbeit' as const, status: 'geplant' as const })

// Work start 08:00, target 8h, gap 2h, end of day 16:30
const basis: BookingNotificationInput = {
  currentMinute: 600,
  targetMin: 480,
  blocks: [],
  workStart: 480,
  gapMin: 120,
  endOfDay: 990,
  lastNotifiedMinute: {},
}
const withOverrides = (part: Partial<BookingNotificationInput>) => checkBookingNotification({ ...basis, ...part })

describe('checkBookingNotification', () => {
  it('is silent on days without a target', () => {
    expect(withOverrides({ targetMin: 0, currentMinute: 1100 })).toBeNull()
  })

  it('is silent before work start plus gap', () => {
    expect(withOverrides({ currentMinute: 599 })).toBeNull()
  })

  it('notifies when nothing has been booked since work start', () => {
    const e = withOverrides({ currentMinute: 600 })
    expect(e?.kind).toBe('gap')
    expect(e?.text).toContain('noch nichts gebucht')
  })

  it('measures the gap from the end of the last booked block', () => {
    expect(withOverrides({ currentMinute: 700, blocks: [booked(480, 600)] })).toBeNull()
    const e = withOverrides({ currentMinute: 720, blocks: [booked(480, 600)] })
    expect(e?.kind).toBe('gap')
    expect(e?.text).toContain('10:00')
  })

  it('does not count planned blocks as booked', () => {
    expect(withOverrides({ currentMinute: 720, blocks: [planned(480, 720)] })?.kind).toBe('gap')
  })

  it('repeats the gap notification only after one interval', () => {
    expect(withOverrides({ currentMinute: 700, lastNotifiedMinute: { gap: 600 } })).toBeNull()
    expect(withOverrides({ currentMinute: 720, lastNotifiedMinute: { gap: 600 } })?.kind).toBe('gap')
  })

  it('is silent when the target is already met', () => {
    expect(withOverrides({ currentMinute: 900, blocks: [booked(240, 720)] })).toBeNull()
    expect(withOverrides({ currentMinute: 1100, blocks: [booked(240, 720)] })).toBeNull()
  })

  it('notifies about missing time from end of day on', () => {
    const e = withOverrides({ currentMinute: 990, blocks: [booked(480, 855)] })
    expect(e?.kind).toBe('end_of_day')
    expect(e?.text).toContain('6:15 von 8:00')
  })

  it('notifies at most twice at end of day: at the time and one hour later', () => {
    const blocks = [booked(480, 900)]
    expect(withOverrides({ currentMinute: 1000, blocks, lastNotifiedMinute: { end_of_day: 990 } })).toBeNull()
    expect(withOverrides({ currentMinute: 1050, blocks, lastNotifiedMinute: { end_of_day: 990 } })?.kind).toBe('end_of_day')
    expect(withOverrides({ currentMinute: 1200, blocks, lastNotifiedMinute: { end_of_day: 1050 } })).toBeNull()
  })

  it('no longer notifies about gaps after end of day', () => {
    expect(withOverrides({ currentMinute: 1100, blocks: [booked(480, 600)], lastNotifiedMinute: { end_of_day: 1050 } })).toBeNull()
  })
})
