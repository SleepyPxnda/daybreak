import { describe, expect, it } from 'vitest'
import type { DayEntry } from '../shared/utils/target'
import { yearDays, nextVacation, vacationBalance, vacationDays, vacationPrefill } from '../shared/utils/vacation'

const E = { targetPerDayMin: 480, workdays: [1, 2, 3, 4, 5], federalState: 'BW' }

const day = (date: string, type: DayEntry['type']): [string, DayEntry] => [date, { date, type }]

describe('vacationDays', () => {
  it('vacation 1, half vacation 0.5, otherwise 0 - only on workdays', () => {
    expect(vacationDays({ type: 'vacation', isWorkday: true })).toBe(1)
    expect(vacationDays({ type: 'half_vacation', isWorkday: true })).toBe(0.5)
    expect(vacationDays({ type: 'sick', isWorkday: true })).toBe(0)
    expect(vacationDays({ type: 'vacation', isWorkday: false })).toBe(0)
  })
})

describe('vacationBalance', () => {
  const entitlements = vacationPrefill(2026)

  it('defaults: 32 + 2 + 2 = 36', () => {
    expect(entitlements.map(p => p.days)).toEqual([32, 2, 2])
    expect(entitlements[1]!.label).toBe('Sonderurlaub WS 26/27')
    expect(entitlements[2]!.label).toBe('Sonderurlaub SS 27')
  })

  it('taken up to today (inclusive), planned after, remaining', () => {
    const days = Object.fromEntries([
      day('2026-08-10', 'vacation'), // Mon
      day('2026-08-11', 'half_vacation'),
      day('2026-09-28', 'vacation'), // today
      day('2026-12-21', 'vacation'),
      day('2026-12-22', 'vacation'),
    ])
    expect(vacationBalance(2026, entitlements, days, '2026-09-28', E)).toEqual({
      year: 2026, entitlement: 36, taken: 2.5, planned: 2, carryover: 31.5,
    })
  })

  it('vacation on a weekend or holiday does not count', () => {
    const days = Object.fromEntries([
      day('2026-10-03', 'vacation'), // Saturday
      day('2026-06-04', 'vacation'), // Corpus Christi
      day('2026-06-05', 'vacation'), // Fri - counts
    ])
    expect(vacationBalance(2026, entitlements, days, '2026-09-28', E).taken).toBe(1)
  })

  it('ignores days of other years and other types', () => {
    const days = Object.fromEntries([day('2025-12-29', 'vacation'), day('2026-03-02', 'sick'), day('2026-03-03', 'flex_day')])
    expect(vacationBalance(2026, entitlements, days, '2026-09-28', E)).toMatchObject({ taken: 0, planned: 0, carryover: 36 })
  })

  it('remaining can become negative', () => {
    const days = Object.fromEntries([day('2026-09-28', 'vacation')])
    expect(vacationBalance(2026, [{ days: 0 }], days, '2026-09-28', E).carryover).toBe(-1)
  })
})

describe('nextVacation', () => {
  const today = '2026-09-28' // Monn

  it('no vacation -> null', () => {
    expect(nextVacation(today, {}, E)).toBeNull()
  })

  it('range spanning weekends and holidays', () => {
    // Mon 21 Dec - Thu 31 Dec: Christmas (25/26) holidays, weekend in between; 2 Jan 2027 is a Saturday
    const days = Object.fromEntries(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-02'].map(d => day(d, 'vacation')))
    expect(nextVacation(today, days, E)).toMatchObject({
      from: '2026-12-21',
      to: '2026-12-31',
      vacationDays: 8,
      daysUntil: 84,
      running: false,
    })
  })

  it('a workday without vacation ends the range', () => {
    const days = Object.fromEntries([day('2026-10-05', 'vacation'), day('2026-10-07', 'vacation')]) // Mon, Wed
    expect(nextVacation(today, days, E)).toMatchObject({ from: '2026-10-05', to: '2026-10-05', vacationDays: 1 })
  })

  it('workdays until the start (excluding today and the start)', () => {
    const days = Object.fromEntries([day('2026-10-05', 'vacation')]) // next Mon
    expect(nextVacation(today, days, E)).toMatchObject({ daysUntil: 7, workdaysTo: 4 }) // Tue-Fri
  })

  it('ongoing vacation: start in the past, running = true', () => {
    const days = Object.fromEntries(['2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29'].map(d => day(d, 'vacation'))) // Thu-Tue across the weekend
    expect(nextVacation(today, days, E)).toMatchObject({ from: '2026-09-24', to: '2026-09-29', running: true, daysUntil: 0, vacationDays: 4 })
  })

  it('today is a weekend in the middle of a vacation -> running', () => {
    const days = Object.fromEntries(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'].map(d => day(d, 'vacation'))) // Thu-Tue
    expect(nextVacation('2026-10-03', days, E)).toMatchObject({ from: '2026-10-01', to: '2026-10-06', running: true })
  })

  it('weekend before the vacation start without prior vacation -> not running', () => {
    const days = Object.fromEntries([day('2026-10-05', 'vacation')])
    expect(nextVacation('2026-10-03', days, E)).toMatchObject({ from: '2026-10-05', running: false, daysUntil: 2, workdaysTo: 0 })
  })

  it('no infinite loop without workdays', () => {
    const days = Object.fromEntries([day('2026-10-05', 'vacation')])
    expect(nextVacation(today, days, { ...E, workdays: [] })).toBeNull()
  })

  it('half vacation day counts as vacation with 0.5', () => {
    const days = Object.fromEntries([day('2026-10-02', 'half_vacation')])
    expect(nextVacation(today, days, E)).toMatchObject({ from: '2026-10-02', vacationDays: 0.5 })
  })

  it('sick and flex days are not vacation', () => {
    const days = Object.fromEntries([day('2026-10-01', 'sick'), day('2026-10-02', 'flex_day')])
    expect(nextVacation(today, days, E)).toBeNull()
  })
})

describe('yearDays', () => {
  it('365 or 366 days', () => {
    expect(yearDays(2026)).toHaveLength(365)
    expect(yearDays(2028)).toHaveLength(366)
  })
})
