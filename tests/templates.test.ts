import { describe, expect, it } from 'vitest'
import { dayInfo } from '../shared/utils/target'
import type { DayEntry } from '../shared/utils/target'
import { materialize, templateAppliesOn } from '../shared/utils/templates'
import type { MaterializationInput, TemplateRule } from '../shared/utils/templates'

const settings = { targetPerDayMin: 480, workdays: [1, 2, 3, 4, 5], federalState: 'BW' }

const daily: TemplateRule = {
  id: 1,
  start: 570, // 09:30
  end: 585, // 09:45
  weekdays: [1, 2, 3, 4, 5],
  intervalWeeks: 1,
  validFrom: '2026-01-01',
  active: true,
}

function input(part: Partial<MaterializationInput> & { days?: Record<string, DayEntry> } = {}): MaterializationInput {
  const { days = {}, ...carryover } = part
  return {
    templates: [daily],
    // Mon 1 June - Sun 14 June 2026, Thu 4 June = Corpus Christi
    from: '2026-06-01',
    to: '2026-06-14',
    today: '2026-06-01',
    dayInfo: d => dayInfo(d, days[d], settings),
    exceptions: [],
    existing: [],
    ...carryover,
  }
}

describe('templateAppliesOn', () => {
  it('checks weekdays and validity', () => {
    expect(templateAppliesOn(daily, '2026-06-01')).toBe(true)
    expect(templateAppliesOn(daily, '2026-06-06')).toBe(false) // Saturday
    expect(templateAppliesOn({ ...daily, validFrom: '2026-06-02' }, '2026-06-01')).toBe(false)
    expect(templateAppliesOn({ ...daily, validUntil: '2026-06-01' }, '2026-06-02')).toBe(false)
    expect(templateAppliesOn({ ...daily, active: false }, '2026-06-01')).toBe(false)
  })

  it('every 2nd week counts from the week of the valid-from date', () => {
    const jf = { ...daily, weekdays: [2], intervalWeeks: 2, validFrom: '2026-06-03' } // Wed, week 1-7 June
    expect(templateAppliesOn(jf, '2026-06-09')).toBe(false) // Tue, week 2
    expect(templateAppliesOn(jf, '2026-06-16')).toBe(true) // Tue, week 3
    expect(templateAppliesOn(jf, '2026-06-02')).toBe(false) // before valid-from
  })
})

describe('materialize - daily Mon-Fri 09:30-09:45', () => {
  it('exactly one block per workday, none on holidays or weekends', () => {
    const { created, conflicts } = materialize(input())
    expect(created.map(b => b.date)).toEqual([
      '2026-06-01', '2026-06-02', '2026-06-03', // Thu 4 June (Corpus Christi) is missing
      '2026-06-05',
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12',
    ])
    expect(created.every(b => b.start === 570 && b.end === 585 && b.templateId === 1)).toBe(true)
    expect(conflicts).toEqual([])
  })

  it('no blocks on vacation, sick or flex days', () => {
    const days: Record<string, DayEntry> = {
      '2026-06-01': { date: '2026-06-01', type: 'vacation' },
      '2026-06-02': { date: '2026-06-02', type: 'sick' },
      '2026-06-03': { date: '2026-06-03', type: 'flex_day' },
      '2026-06-05': { date: '2026-06-05', type: 'half_vacation' },
    }
    const data = materialize(input({ to: '2026-06-05', days })).created.map(b => b.date)
    expect(data).toEqual(['2026-06-05'])
  })

  it('creates no duplicates when the block already exists', () => {
    const existing = [{ date: '2026-06-01', start: 570, end: 585, templateId: 1 }]
    const { created } = materialize(input({ to: '2026-06-02', existing }))
    expect(created.map(b => b.date)).toEqual(['2026-06-02'])
  })

  it('does not recreate a moved appointment (same templateId, different time)', () => {
    const existing = [{ date: '2026-06-01', start: 600, end: 615, templateId: 1 }]
    expect(materialize(input({ to: '2026-06-01', existing })).created).toEqual([])
  })

  it('does not recreate a deleted single appointment', () => {
    const { created } = materialize(input({ to: '2026-06-02', exceptions: [{ templateId: 1, date: '2026-06-01' }] }))
    expect(created.map(b => b.date)).toEqual(['2026-06-02'])
  })

  it('occupied range -> conflict instead of block', () => {
    const existing = [{ date: '2026-06-01', start: 540, end: 600 }]
    const { created, conflicts } = materialize(input({ to: '2026-06-01', existing }))
    expect(created).toEqual([])
    expect(conflicts).toEqual([{ templateId: 1, date: '2026-06-01' }])
  })

  it('at most 14 days into the future', () => {
    const { created } = materialize(input({ from: '2026-06-01', to: '2026-07-31', today: '2026-06-01' }))
    expect(created.at(-1)?.date).toBe('2026-06-15')
  })

  it('two overlapping templates on the same day -> the second is a conflict', () => {
    const second = { ...daily, id: 2, start: 575 - 5, end: 600 }
    const { created, conflicts } = materialize(input({ to: '2026-06-01', templates: [daily, second] }))
    expect(created.map(b => b.templateId)).toEqual([1])
    expect(conflicts).toEqual([{ templateId: 2, date: '2026-06-01' }])
  })
})
