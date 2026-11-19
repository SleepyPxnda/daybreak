import { describe, expect, it } from 'vitest'
import type { OverviewBlock } from '../shared/utils/overview'
import { groupOverview, monthClosing } from '../shared/utils/overview'

const apollo = { accountId: 1, accountName: 'Projekt Apollo', accountColor: 'lavender' }
const meeting = { accountId: 2, accountName: 'Firmenmeeting', accountColor: 'mint' }
const login = { taskId: 10, taskKey: 'PROJ-123', taskTitle: 'Login-Refactoring' }
const accountOrder = [1, 2]
const withoutTask = { taskId: null, taskKey: null, taskTitle: null }

function b(date: string, start: number, end: number, part: Partial<OverviewBlock> = {}): OverviewBlock {
  return { date, start, end, kind: 'work', status: 'booked', note: null, ...apollo, ...login, ...part }
}

describe('groupOverview', () => {
  it('groups account -> task -> days with totals', () => {
    const overview = groupOverview([
      b('2026-09-28', 540, 840),
      b('2026-09-29', 540, 840),
      b('2026-09-29', 900, 960, { ...meeting, ...withoutTask }),
    ], accountOrder)
    expect(overview.total).toBe(660)
    expect(overview.accounts.map(k => [k.name, k.minutes])).toEqual([['Projekt Apollo', 600], ['Firmenmeeting', 60]])
    const task = overview.accounts[0]!.tasks[0]!
    expect(task.key).toBe('PROJ-123')
    expect(task.days.map(t => [t.date, t.minutes])).toEqual([['2026-09-28', 300], ['2026-09-29', 300]])
  })

  it('time booked directly on the account becomes a row without a task', () => {
    const overview = groupOverview([b('2026-09-28', 540, 600), b('2026-09-28', 600, 720, withoutTask)], accountOrder)
    const tasks = overview.accounts[0]!.tasks
    expect(tasks.map(a => [a.taskId, a.minutes])).toEqual([[null, 120], [10, 60]])
  })

  it('shares refer to the level above', () => {
    const overview = groupOverview([
      b('2026-09-28', 480, 720),
      b('2026-09-29', 480, 540, withoutTask),
      b('2026-09-29', 540, 600, { ...meeting, ...withoutTask }),
    ], accountOrder)
    expect(overview.accounts.map(k => k.share)).toEqual([300 / 360, 60 / 360])
    expect(overview.accounts[0]!.tasks.map(a => a.share)).toEqual([240 / 300, 60 / 300])
    expect(overview.accounts[0]!.tasks[0]!.days[0]!.share).toBe(1)
  })

  it('ignores planned blocks and breaks', () => {
    const overview = groupOverview([
      b('2026-09-28', 480, 540, { status: 'planned' }),
      b('2026-09-28', 720, 750, { kind: 'break', accountId: null, ...withoutTask }),
    ], accountOrder)
    expect(overview).toEqual({ total: 0, accounts: [] })
  })

  it('collects block notes per day without duplicates', () => {
    const overview = groupOverview([
      b('2026-09-28', 480, 540, { note: 'Review' }),
      b('2026-09-28', 540, 600, { note: ' Review ' }),
      b('2026-09-28', 600, 660, { note: 'Tests' }),
      b('2026-09-28', 660, 720, { note: '' }),
    ], accountOrder)
    expect(overview.accounts[0]!.tasks[0]!.days[0]!.notes).toEqual(['Review', 'Tests'])
  })
})

describe('groupOverview account order', () => {
  const archived = { accountId: 3, accountName: 'Altprojekt', accountColor: 'sky' }

  it('follows the given order even when a later account has more hours', () => {
    const overview = groupOverview([
      b('2026-09-28', 480, 540),
      b('2026-09-28', 540, 720, { ...meeting, ...withoutTask }),
    ], [2, 1])
    expect(overview.accounts.map(k => k.name)).toEqual(['Firmenmeeting', 'Projekt Apollo'])
  })

  it('keeps an archived account at the end of the order in the result', () => {
    const overview = groupOverview([
      b('2026-09-28', 480, 720, { ...archived, ...withoutTask }),
      b('2026-09-28', 720, 780),
      b('2026-09-28', 780, 840, { ...meeting, ...withoutTask }),
    ], [1, 2, 3])
    expect(overview.accounts.map(k => k.name)).toEqual(['Projekt Apollo', 'Firmenmeeting', 'Altprojekt'])
    expect(overview.total).toBe(360)
  })

  it('keeps tasks by hours descending and days chronological', () => {
    const overview = groupOverview([
      b('2026-09-29', 480, 540),
      b('2026-09-28', 540, 600),
      b('2026-09-28', 600, 780, { taskId: 11, taskKey: 'PROJ-9', taskTitle: 'Doku' }),
    ], accountOrder)
    expect(overview.accounts[0]!.tasks.map(task => task.key)).toEqual(['PROJ-9', 'PROJ-123'])
    expect(overview.accounts[0]!.tasks[1]!.days.map(day => day.date)).toEqual(['2026-09-28', '2026-09-29'])
  })
})

describe('monthClosing', () => {
  const day = { date: '2026-09-28', target: 480 }

  it('start, end, break including gaps, and actual', () => {
    const [closingDay] = monthClosing([
      b('2026-09-28', 480, 720), // 08:00-12:00
      b('2026-09-28', 720, 750, { kind: 'break', accountId: null, ...withoutTask }), // break block 0:30
      b('2026-09-28', 780, 1020), // 13:00-17:00 (gap 12:30-13:00)
    ], [day], accountOrder)
    expect(closingDay).toMatchObject({ start: 480, end: 1020, actual: 480, isBreak: 60, target: 480 })
  })

  it('sums accounts with keys, titles and notes without duplicates', () => {
    const [closingDay] = monthClosing([
      b('2026-09-28', 480, 600),
      b('2026-09-28', 600, 660, { taskId: 11, taskKey: null, taskTitle: 'Doku' }),
      b('2026-09-28', 660, 720),
      b('2026-09-28', 720, 780, { ...meeting, ...withoutTask, note: 'Jour fixe' }),
      b('2026-09-28', 780, 810, { ...meeting, ...withoutTask }),
    ], [day], accountOrder)
    expect(closingDay!.accounts).toEqual([
      { accountId: 1, name: 'Projekt Apollo', color: 'lavender', minutes: 240, labels: ['PROJ-123', 'Doku'] },
      { accountId: 2, name: 'Firmenmeeting', color: 'mint', minutes: 90, labels: ['Jour fixe'] },
    ])
  })

  it('orders the accounts of a day by the given order, not by minutes', () => {
    const [closingDay] = monthClosing([
      b('2026-09-28', 480, 600),
      b('2026-09-28', 600, 780, { ...meeting, ...withoutTask }),
    ], [day], [2, 1])
    expect(closingDay!.accounts.map(k => k.accountId)).toEqual([2, 1])
  })

  it('planned blocks do not count; a day without bookings stays empty', () => {
    const days = monthClosing([b('2026-09-28', 480, 540, { status: 'planned' })], [day, { date: '2026-09-29', target: 480 }], accountOrder)
    expect(days).toEqual([
      { date: '2026-09-28', target: 480, start: null, end: null, actual: 0, isBreak: 0, accounts: [] },
      { date: '2026-09-29', target: 480, start: null, end: null, actual: 0, isBreak: 0, accounts: [] },
    ])
  })
})
