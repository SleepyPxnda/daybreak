import { describe, expect, it } from 'vitest'
import { currentBalance, balanceHistory } from '../shared/utils/balance'
import type { BalanceInput } from '../shared/utils/balance'

const settings = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

function input(part: Partial<BalanceInput>): BalanceInput {
  return {
    start: { date: '2026-06-01', balanceMin: 0 },
    today: '2026-06-08',
    actualPerDay: {},
    days: {},
    settings,
    ...part,
  }
}

// Week 1-7 June 2026: Mon-Wed work, Thu 4 June Corpus Christi (BW), Fri work, Sat/Sun off. Today = Mon 8 June.
const fullWeek = {
  '2026-06-01': 480,
  '2026-06-02': 480,
  '2026-06-03': 480,
  '2026-06-05': 480,
}

describe('balance', () => {
  it('a balanced week with a holiday yields 0', () => {
    expect(currentBalance(input({ actualPerDay: fullWeek }))).toBe(0)
  })

  it('starts with the starting balance', () => {
    expect(currentBalance(input({ start: { date: '2026-06-01', balanceMin: 195 }, actualPerDay: fullWeek }))).toBe(195)
  })

  it('work on a holiday and on weekends is positive', () => {
    expect(currentBalance(input({ actualPerDay: { ...fullWeek, '2026-06-04': 60, '2026-06-06': 120 } }))).toBe(180)
  })

  it('today does not count, even with bookings', () => {
    expect(currentBalance(input({ actualPerDay: { ...fullWeek, '2026-06-08': 600 } }))).toBe(0)
  })

  it('flex day: -8h', () => {
    const days = { '2026-06-05': { date: '2026-06-05', type: 'gleittag' as const } }
    const { '2026-06-05': _, ...withoutFriday } = fullWeek
    expect(currentBalance(input({ actualPerDay: withoutFriday, days }))).toBe(-480)
  })

  it('half vacation day: 4h target', () => {
    const days = { '2026-06-05': { date: '2026-06-05', type: 'halb_urlaub' as const } }
    expect(currentBalance(input({ actualPerDay: { ...fullWeek, '2026-06-05': 300 }, days }))).toBe(60)
  })

  it('vacation: 0 target, no booking needed', () => {
    const days = { '2026-06-05': { date: '2026-06-05', type: 'urlaub' as const } }
    const { '2026-06-05': _, ...withoutFriday } = fullWeek
    expect(currentBalance(input({ actualPerDay: withoutFriday, days }))).toBe(0)
  })

  it('target override', () => {
    const days = { '2026-06-05': { date: '2026-06-05', type: 'arbeit' as const, targetOverride: 240 } }
    expect(currentBalance(input({ actualPerDay: fullWeek, days }))).toBe(240)
  })

  it('missing bookings on workdays are negative', () => {
    expect(currentBalance(input({ actualPerDay: { '2026-06-01': 480 } }))).toBe(-3 * 480)
  })

  it('start date in the future or today: starting balance only', () => {
    expect(currentBalance(input({ start: { date: '2026-06-08', balanceMin: 30 } }))).toBe(30)
  })
})

describe('balanceHistory', () => {
  // Start Fri 29 May 2026, today Wed 3 June -> May: only 29 May (Fri), June: 1-2 June (Mon, Tue), ongoing
  const historyInput = input({
    start: { date: '2026-05-29', balanceMin: 60 },
    today: '2026-06-03',
    actualPerDay: { '2026-05-29': 540, '2026-06-01': 420, '2026-06-02': 480, '2026-06-03': 600 },
  })

  it('monthly delta and balance at month end', () => {
    expect(balanceHistory(historyInput)).toEqual([
      { month: '2026-05', delta: 60, state: 120, ongoing: false },
      { month: '2026-06', delta: -60, state: 60, ongoing: true },
    ])
  })

  it('last balance equals the current balance', () => {
    expect(balanceHistory(historyInput).at(-1)?.state).toBe(currentBalance(historyInput))
  })

  it('on the first of the month: current month with delta 0', () => {
    const v = balanceHistory(input({ start: { date: '2026-05-29', balanceMin: 0 }, today: '2026-06-01', actualPerDay: { '2026-05-29': 480 } }))
    expect(v).toEqual([
      { month: '2026-05', delta: 0, state: 0, ongoing: false },
      { month: '2026-06', delta: 0, state: 0, ongoing: true },
    ])
  })

  it('start today: only the current month with the starting balance', () => {
    expect(balanceHistory(input({ start: { date: '2026-06-08', balanceMin: 30 } }))).toEqual([
      { month: '2026-06', delta: 0, state: 30, ongoing: true },
    ])
  })

  it('start in the future: empty', () => {
    expect(balanceHistory(input({ start: { date: '2026-07-01', balanceMin: 30 } }))).toEqual([])
  })
})
