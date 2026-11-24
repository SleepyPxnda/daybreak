import { describe, expect, it } from 'vitest'
import type { DayEntry } from '../shared/utils/target'
import { dayInfo } from '../shared/utils/target'
import type { HandedOnEntitlement } from '../shared/utils/vacation'
import { allocateVacationDays, passesToNextYear, yearDays, nextVacation, vacationBalance, vacationDays, vacationPrefill, vacationDeductionText, vacationWindowText } from '../shared/utils/vacation'

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
      year: 2026,
      entitlement: 36,
      taken: 2.5,
      planned: 2,
      forfeited: 0,
      carryover: 31.5,
      carryoverToNextYear: 31.5,
      entitlementUsage: [
        { used: 0, remaining: 32, forfeited: 0 },
        { used: 0, remaining: 2, forfeited: 0 },
        { used: 0, remaining: 2, forfeited: 0 },
      ],
      handedOnEntitlements: [],
      passedToNextYear: [],
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

const vacationOn = (...dates: string[]) => Object.fromEntries(dates.map(date => day(date, 'vacation')))
const handedOnWinter = (days: number): HandedOnEntitlement => ({
  fromYear: 2026, label: 'Sonderurlaub WS 26/27', kind: 'extra', days, validFrom: '2026-10-01', validUntil: '2027-03-31',
})

describe('allocateVacationDays', () => {
  const summer = { days: 2, validFrom: '2026-04-01', validUntil: '2026-09-30' }

  it('uses a limited entry inside its window, the pool outside', () => {
    const { usedOwn } = allocateVacationDays(2026, [{ days: 32 }, summer], [], { '2026-03-02': 1, '2026-05-04': 1 })
    expect(usedOwn).toEqual([0, 1])
  })

  it('earliest window end first; only "Gültig ab" ends on 31 Dec of the entry year', () => {
    const open = { days: 2, validFrom: '2026-01-01' }
    const early = { days: 2, validFrom: '2026-01-01', validUntil: '2026-06-30' }
    expect(allocateVacationDays(2026, [open, early], [], { '2026-05-04': 1 }).usedOwn).toEqual([0, 1])
  })

  it('on equal window ends handed-on goes before own', () => {
    const own = { days: 2, validFrom: '2026-10-01', validUntil: '2027-03-31' }
    const result = allocateVacationDays(2027, [own], [handedOnWinter(1)], { '2027-01-04': 1 })
    expect(result).toEqual({ usedOwn: [0], usedHandedOn: [1] })
  })

  it('a partly overlapping vacation uses the limited entry only inside the window', () => {
    const { usedOwn } = allocateVacationDays(2026, [summer], [], { '2026-09-29': 1, '2026-09-30': 1, '2026-10-01': 1 })
    expect(usedOwn).toEqual([2])
  })

  it('splits a day between entries: 0.5 left, then next entry, then the pool', () => {
    const limited = { days: 0.5, validFrom: '2026-01-01', validUntil: '2026-06-30' }
    const later = { days: 2, validFrom: '2026-01-01', validUntil: '2026-12-31' }
    expect(allocateVacationDays(2026, [limited, later], [], { '2026-05-04': 1 }).usedOwn).toEqual([0.5, 0.5])
    expect(allocateVacationDays(2026, [limited], [], { '2026-05-04': 0.5, '2026-05-05': 1 }).usedOwn).toEqual([0.5])
  })

  it('a half vacation day uses 0.5', () => {
    expect(allocateVacationDays(2026, [summer], [], { '2026-05-04': 0.5 }).usedOwn).toEqual([0.5])
  })

  it('walks the days in date order, whatever order the record lists them in', () => {
    const october = { days: 1, validFrom: '2026-10-01', validUntil: '2026-10-31' }
    const fromSixthOfOctober = { days: 1, validFrom: '2026-10-06' }
    // Inserted out of order: without the date sort the 6th would take the October entry and the 5th would fall to the pool
    const { usedOwn } = allocateVacationDays(2026, [october, fromSixthOfOctober], [], { '2026-10-06': 1, '2026-10-05': 1 })
    expect(usedOwn).toEqual([1, 1])
  })
})

describe('passesToNextYear', () => {
  const winterEntry = { days: 2, validFrom: '2026-10-01', validUntil: '2027-03-31' }

  it('is true for a limited entry that ends after the year and has days left', () => {
    expect(passesToNextYear(2026, winterEntry, 1)).toBe(true)
  })

  it('is false without days left', () => {
    expect(passesToNextYear(2026, winterEntry, 0)).toBe(false)
  })

  it('is false for an unlimited entry and for an entry ending on 31 Dec', () => {
    expect(passesToNextYear(2026, { days: 32 }, 5)).toBe(false)
    expect(passesToNextYear(2026, { days: 2, validFrom: '2026-04-01', validUntil: '2026-12-31' }, 1)).toBe(false)
  })
})

describe('vacationBalance with validity windows', () => {
  const base = { kind: 'base' as const, label: 'Grundanspruch', days: 32 }
  const winter = { kind: 'extra' as const, label: 'Sonderurlaub WS 26/27', days: 2, validFrom: '2026-10-01', validUntil: '2027-03-31' }
  const summer = { kind: 'extra' as const, label: 'Sonderurlaub SS 27', days: 2, validFrom: '2027-04-01', validUntil: '2027-09-30' }

  it('weekend and holiday days use nothing, taken and planned days both count', () => {
    const entry = { days: 2, validFrom: '2026-10-01', validUntil: '2026-12-31' }
    const days = vacationOn('2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07') // Sat, then Mon-Wed
    const balance = vacationBalance(2026, [entry], days, '2026-10-05', E)
    expect(balance.entitlementUsage[0]).toEqual({ used: 2, remaining: 0, forfeited: 0 })
    expect(balance.taken + balance.planned).toBe(3)
  })

  it('AC6 example: cross-year entry counts fully in 2026 and hands the remainder to 2027', () => {
    // 30 regular workdays before 1 Oct 2026 come from the pool
    const workdays = yearDays(2026).filter(date => date < '2026-10-01' && dayInfo(date, undefined, E).isWorkday).slice(0, 30)
    const days2026 = vacationOn(...workdays, '2026-12-28')
    const account2026 = vacationBalance(2026, [base, winter], days2026, '2026-11-19', E)
    expect(account2026.entitlement).toBe(34)
    expect(account2026.taken + account2026.planned).toBe(31)
    expect(account2026.carryover).toBe(3)
    expect(account2026.forfeited).toBe(0)
    expect(account2026.passedToNextYear).toEqual([
      { fromYear: 2026, label: 'Sonderurlaub WS 26/27', kind: 'extra', days: 1, validFrom: '2026-10-01', validUntil: '2027-03-31' },
    ])
    // AC8: the open WS day is not part of the general carry-over
    expect(account2026.carryoverToNextYear).toBe(2)

    const days = { ...days2026, ...vacationOn('2027-01-04') }
    const account2027 = vacationBalance(2027, [{ kind: 'base', label: 'Grund', days: 30 }], days, '2027-01-01', E, account2026.passedToNextYear)
    expect(account2027.entitlement).toBe(31)
    expect(account2027.entitlementUsage).toEqual([{ used: 0, remaining: 30, forfeited: 0 }])
    expect(account2027.handedOnEntitlements[0]).toMatchObject({ used: 1, remaining: 0, forfeited: 0 })
    expect(account2027.passedToNextYear).toEqual([])
  })

  it('a cross-year entry fully used passes nothing on; one valid only next year is handed on whole', () => {
    const account = vacationBalance(2026, [base, winter, summer], vacationOn('2026-10-05', '2026-10-06'), '2026-09-01', E)
    expect(account.passedToNextYear.map(entry => [entry.label, entry.days])).toEqual([['Sonderurlaub SS 27', 2]])
    expect(account.entitlement).toBe(36)
    expect(account.carryover).toBe(34)
  })

  it('forfeits unused days after the window end, only in the year it ends', () => {
    const entry = { days: 2, validFrom: '2026-04-01', validUntil: '2026-09-30' }
    const days = vacationOn('2026-05-04')
    const after = vacationBalance(2026, [{ days: 32 }, entry], days, '2026-10-01', E)
    expect(after.forfeited).toBe(1)
    expect(after.entitlement).toBe(34)
    expect(after.carryover).toBe(34 - 1 - 1)
    expect(after.carryoverToNextYear).toBe(32)
    expect(vacationBalance(2026, [{ days: 32 }, entry], days, '2026-09-30', E).forfeited).toBe(0)
    expect(vacationBalance(2026, [entry], vacationOn('2026-05-04', '2026-05-05'), '2026-12-01', E).forfeited).toBe(0)
  })

  it('an unused limited entry ending 31 Dec is in carryover but not carryoverToNextYear', () => {
    const entry = { days: 2, validFrom: '2026-10-01' }
    const account = vacationBalance(2026, [{ days: 32 }, entry], {}, '2026-06-01', E)
    expect(account.carryover).toBe(34)
    expect(account.carryoverToNextYear).toBe(32)
  })

  it('a cross-year entry is not forfeited in its own year but through the handed-on entry in the next', () => {
    const own = vacationBalance(2026, [base, winter], {}, '2027-05-01', E)
    expect(own.forfeited).toBe(0)
    expect(own.carryoverToNextYear).toBe(32)
    const next = vacationBalance(2027, [], {}, '2027-05-01', E, own.passedToNextYear)
    expect(next.forfeited).toBe(2)
    expect(next.entitlement).toBe(2)
    expect(next.carryover).toBe(0)
  })

  it('a handed-on entry with days left is not part of carryoverToNextYear', () => {
    const next = vacationBalance(2027, [{ days: 30 }], {}, '2027-01-02', E, [handedOnWinter(1)])
    expect(next.carryover).toBe(31)
    expect(next.carryoverToNextYear).toBe(30)
  })
})

describe('vacationBalance fail-fast', () => {
  it('throws when an entry to hand on has no kind or label', () => {
    const entryWithoutKindAndLabel = { days: 2, validFrom: '2026-10-01', validUntil: '2027-03-31' }
    expect(() => vacationBalance(2026, [entryWithoutKindAndLabel], {}, '2026-06-01', E)).toThrow()
  })
})

describe('vacationWindowText', () => {
  it('both bounds in the shown year: without years', () => {
    expect(vacationWindowText('2026-04-01', '2026-09-30', 2026)).toBe('gültig 01.04.–30.09.')
  })

  it('across the year boundary: with years, in either year', () => {
    expect(vacationWindowText('2026-10-01', '2027-03-31', 2026)).toBe('gültig 01.10.2026–31.03.2027')
    expect(vacationWindowText('2026-10-01', '2027-03-31', 2027)).toBe('gültig 01.10.2026–31.03.2027')
  })

  it('empty bounds fall back to the shown year', () => {
    expect(vacationWindowText('2026-10-01', null, 2026)).toBe('gültig 01.10.–31.12.')
    expect(vacationWindowText(null, '2026-03-31', 2026)).toBe('gültig 01.01.–31.03.')
  })
})

describe('vacationDeductionText', () => {
  it('shows zero without a sign, including negative zero', () => {
    expect(vacationDeductionText(0)).toBe('0')
    expect(vacationDeductionText(-0)).toBe('0')
  })
  it('prefixes a minus sign and uses one decimal at most', () => {
    expect(vacationDeductionText(4.5)).toBe('−4,5')
    expect(vacationDeductionText(2)).toBe('−2')
    expect(vacationDeductionText(0.25)).toBe('−0,3')
  })
})
