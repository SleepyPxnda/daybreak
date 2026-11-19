import { describe, expect, it } from 'vitest'
import { alterText, isDue, addWorkdays, sortTodos, daysSince } from '../shared/utils/todos'
import type { TodoBasis } from '../shared/utils/todos'

const E = { targetPerDayMin: 480, workdays: [1, 2, 3, 4, 5], federalState: 'BW' }

describe('addWorkdays', () => {
  it('skips weekends', () => {
    expect(addWorkdays('2026-09-28', 3, E)).toBe('2026-10-01') // Mon -> Thu
    expect(addWorkdays('2026-10-01', 3, E)).toBe('2026-10-06') // Thu -> Tue
  })

  it('skips holidays (BW)', () => {
    // Wed 3 June 2026 + 1 workday: Thu 4 June is Corpus Christi -> Fri 5 June
    expect(addWorkdays('2026-06-03', 1, E)).toBe('2026-06-05')
  })
})

describe('due date and age', () => {
  it('waiting: due from the follow-up date', () => {
    expect(isDue({ kind: 'waiting_for', followUpDate: '2026-09-28' }, '2026-09-28')).toBe(true)
    expect(isDue({ kind: 'waiting_for', followUpDate: '2026-09-29' }, '2026-09-28')).toBe(false)
    expect(isDue({ kind: 'waiting_for', followUpDate: null }, '2026-09-28')).toBe(false)
  })

  it('reminder: due from its due date, daily never', () => {
    expect(isDue({ kind: 'reminder', dueDate: '2026-09-27' }, '2026-09-28')).toBe(true)
    expect(isDue({ kind: 'daily_topic', dueDate: '2026-09-27' }, '2026-09-28')).toBe(false)
  })

  it('age in days', () => {
    expect(daysSince('2026-09-23T10:00:00.000Z', '2026-09-28')).toBe(5)
    expect(alterText(5)).toBe('seit 5 Tagen')
    expect(alterText(1)).toBe('seit gestern')
    expect(alterText(0)).toBe('seit heute')
  })
})

describe('sortTodos', () => {
  const t = (id: number, sortOrder: number, followUpDate: string | null = null): TodoBasis =>
    ({ id, kind: 'waiting_for', sortOrder, followUpDate, createdAt: '2026-09-01T00:00:00Z' })

  it('due items on top (oldest cutoff date first), the rest by sort order', () => {
    const list = [t(1, 0), t(2, 1, '2026-09-27'), t(3, 2), t(4, 3, '2026-09-20'), t(5, 4, '2026-10-05')]
    expect(sortTodos(list, '2026-09-28').map(x => x.id)).toEqual([4, 2, 1, 3, 5])
  })
})
