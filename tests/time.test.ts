import { describe, expect, it } from 'vitest'
import {
  snapToGrid,
  dateRange,
  formatDuration,
  formatDecimal,
  formatBalance,
  formatTime,
  isIsoDate,
  isOnGrid,
  parseTime,
  addDays,
  daysBetween,
  weekday,
} from '../shared/utils/time'

describe('time', () => {
  it('validates the date format', () => {
    expect(isIsoDate('2026-09-28')).toBe(true)
    expect(isIsoDate('2026-9-28')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
  })

  it('does day arithmetic across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7)
    // the daylight saving change (25 Oct 2026) does not shift days
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })

  it('returns ISO weekdays', () => {
    expect(weekday('2026-09-28')).toBe(1) // Monday
    expect(weekday('2026-10-04')).toBe(7) // Sunday
  })

  it('lists date ranges inclusively', () => {
    expect(dateRange('2026-09-30', '2026-10-02')).toEqual(['2026-09-30', '2026-10-01', '2026-10-02'])
    expect(dateRange('2026-10-02', '2026-10-01')).toEqual([])
  })

  it('works on the 15-minute grid', () => {
    expect(isOnGrid(570)).toBe(true)
    expect(isOnGrid(575)).toBe(false)
    expect(snapToGrid(577)).toBe(570)
    expect(snapToGrid(578)).toBe(585)
  })

  it('parses times of day', () => {
    expect(parseTime('09:30')).toBe(570)
    expect(parseTime('9:30')).toBe(570)
    expect(parseTime('24:00')).toBe(1440)
    expect(parseTime('24:15')).toBeUndefined()
    expect(parseTime('9:75')).toBeUndefined()
    expect(parseTime('abc')).toBeUndefined()
  })

  it('formats time of day, duration and balance', () => {
    expect(formatTime(570)).toBe('09:30')
    expect(formatTime(0)).toBe('00:00')
    expect(formatDuration(330)).toBe('5:30')
    expect(formatDuration(-30)).toBe('-0:30')
    expect(formatBalance(195)).toBe('+3:15')
    expect(formatBalance(-30)).toBe('-0:30')
    expect(formatBalance(0)).toBe('±0:00')
  })

  it('formats duration and balance in decimal hours', () => {
    expect(formatDecimal(75)).toBe('1,25')
    expect(formatDecimal(150)).toBe('2,5')
    expect(formatDecimal(480)).toBe('8')
    expect(formatDecimal(0)).toBe('0')
    expect(formatDecimal(20)).toBe('0,33')
    expect(formatDecimal(-30)).toBe('-0,5')
    expect(formatBalance(195, formatDecimal)).toBe('+3,25')
    expect(formatBalance(-45, formatDecimal)).toBe('-0,75')
    expect(formatBalance(0, formatDecimal)).toBe('±0')
  })
})
