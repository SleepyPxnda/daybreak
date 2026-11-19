import { describe, expect, it } from 'vitest'
import type { OverviewBlock } from '../shared/utils/overview'
import { groupOverview, monthClosing } from '../shared/utils/overview'

const apollo = { accountId: 1, accountName: 'Projekt Apollo', accountColor: 'lavendel' }
const meeting = { accountId: 2, accountName: 'Firmenmeeting', accountColor: 'mint' }
const login = { taskId: 10, taskKey: 'PROJ-123', taskTitle: 'Login-Refactoring' }
const withoutTask = { taskId: null, taskKey: null, taskTitle: null }

function b(date: string, start: number, end: number, part: Partial<OverviewBlock> = {}): OverviewBlock {
  return { date, start, end, kind: 'arbeit', status: 'gebucht', note: null, ...apollo, ...login, ...part }
}

describe('groupOverview', () => {
  it('groups account -> task -> days with totals', () => {
    const u = groupOverview([
      b('2026-09-28', 540, 840),
      b('2026-09-29', 540, 840),
      b('2026-09-29', 900, 960, { ...meeting, ...withoutTask }),
    ])
    expect(u.total).toBe(660)
    expect(u.accounts.map(k => [k.name, k.minutes])).toEqual([['Projekt Apollo', 600], ['Firmenmeeting', 60]])
    const task = u.accounts[0]!.tasks[0]!
    expect(task.key).toBe('PROJ-123')
    expect(task.days.map(t => [t.date, t.minutes])).toEqual([['2026-09-28', 300], ['2026-09-29', 300]])
  })

  it('time booked directly on the account becomes a row without a task', () => {
    const u = groupOverview([b('2026-09-28', 540, 600), b('2026-09-28', 600, 720, withoutTask)])
    const tasks = u.accounts[0]!.tasks
    expect(tasks.map(a => [a.taskId, a.minutes])).toEqual([[null, 120], [10, 60]])
  })

  it('shares refer to the level above', () => {
    const u = groupOverview([
      b('2026-09-28', 480, 720),
      b('2026-09-29', 480, 540, withoutTask),
      b('2026-09-29', 540, 600, { ...meeting, ...withoutTask }),
    ])
    expect(u.accounts.map(k => k.share)).toEqual([300 / 360, 60 / 360])
    expect(u.accounts[0]!.tasks.map(a => a.share)).toEqual([240 / 300, 60 / 300])
    expect(u.accounts[0]!.tasks[0]!.days[0]!.share).toBe(1)
  })

  it('ignores planned blocks and breaks', () => {
    const u = groupOverview([
      b('2026-09-28', 480, 540, { status: 'geplant' }),
      b('2026-09-28', 720, 750, { kind: 'pause', accountId: null, ...withoutTask }),
    ])
    expect(u).toEqual({ total: 0, accounts: [] })
  })

  it('collects block notes per day without duplicates', () => {
    const u = groupOverview([
      b('2026-09-28', 480, 540, { note: 'Review' }),
      b('2026-09-28', 540, 600, { note: ' Review ' }),
      b('2026-09-28', 600, 660, { note: 'Tests' }),
      b('2026-09-28', 660, 720, { note: '' }),
    ])
    expect(u.accounts[0]!.tasks[0]!.days[0]!.notes).toEqual(['Review', 'Tests'])
  })
})

describe('monthClosing', () => {
  const day = { date: '2026-09-28', target: 480 }

  it('start, end, break including gaps, and actual', () => {
    const [t] = monthClosing([
      b('2026-09-28', 480, 720), // 08:00-12:00
      b('2026-09-28', 720, 750, { kind: 'pause', accountId: null, ...withoutTask }), // break block 0:30
      b('2026-09-28', 780, 1020), // 13:00-17:00 (gap 12:30-13:00)
    ], [day])
    expect(t).toMatchObject({ start: 480, end: 1020, actual: 480, isBreak: 60, target: 480 })
  })

  it('sums accounts with keys, titles and notes without duplicates', () => {
    const [t] = monthClosing([
      b('2026-09-28', 480, 600),
      b('2026-09-28', 600, 660, { taskId: 11, taskKey: null, taskTitle: 'Doku' }),
      b('2026-09-28', 660, 720),
      b('2026-09-28', 720, 780, { ...meeting, ...withoutTask, note: 'Jour fixe' }),
      b('2026-09-28', 780, 810, { ...meeting, ...withoutTask }),
    ], [day])
    expect(t!.accounts).toEqual([
      { accountId: 1, name: 'Projekt Apollo', color: 'lavendel', minutes: 240, labels: ['PROJ-123', 'Doku'] },
      { accountId: 2, name: 'Firmenmeeting', color: 'mint', minutes: 90, labels: ['Jour fixe'] },
    ])
  })

  it('planned blocks do not count; a day without bookings stays empty', () => {
    const days = monthClosing([b('2026-09-28', 480, 540, { status: 'geplant' })], [day, { date: '2026-09-29', target: 480 }])
    expect(days).toEqual([
      { date: '2026-09-28', target: 480, start: null, end: null, actual: 0, isBreak: 0, accounts: [] },
      { date: '2026-09-29', target: 480, start: null, end: null, actual: 0, isBreak: 0, accounts: [] },
    ])
  })
})
