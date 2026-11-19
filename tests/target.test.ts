import { describe, expect, it } from 'vitest'
import { holidayName, dayInfo } from '../shared/utils/target'
import type { TargetSettings } from '../shared/utils/target'

const E: TargetSettings = { targetPerDayMin: 480, workdays: [1, 2, 3, 4, 5], federalState: 'BW' }

describe('holidayName (BW)', () => {
  it('recognizes BW holidays in 2026', () => {
    expect(holidayName('2026-01-06', 'BW')).toBeDefined() // Epiphany
    expect(holidayName('2026-04-03', 'BW')).toBeDefined() // Good Friday
    expect(holidayName('2026-06-04', 'BW')).toBeDefined() // Corpus Christi
    expect(holidayName('2026-11-01', 'BW')).toBeDefined() // All Saints' Day
  })

  it('does not know holidays of other states', () => {
    expect(holidayName('2026-10-31', 'BW')).toBeUndefined() // Reformation Day (not BW)
    expect(holidayName('2026-09-28', 'BW')).toBeUndefined()
  })
})

describe('dayInfo', () => {
  it('workday: full target', () => {
    expect(dayInfo('2026-09-28', undefined, E)).toMatchObject({ target: 480, isWorkday: true, type: 'work' })
  })

  it('weekend: 0', () => {
    expect(dayInfo('2026-10-03', undefined, E)).toMatchObject({ target: 0, isWorkday: false })
  })

  it('BW holiday on a weekday: 0 with name', () => {
    const info = dayInfo('2026-06-04', undefined, E)
    expect(info.target).toBe(0)
    expect(info.isWorkday).toBe(false)
    expect(info.holiday).toBeTruthy()
  })

  it('vacation and sick: 0', () => {
    expect(dayInfo('2026-09-28', { date: '2026-09-28', type: 'vacation' }, E).target).toBe(0)
    expect(dayInfo('2026-09-28', { date: '2026-09-28', type: 'sick' }, E).target).toBe(0)
  })

  it('half vacation day: half target', () => {
    expect(dayInfo('2026-09-28', { date: '2026-09-28', type: 'half_vacation' }, E).target).toBe(240)
  })

  it('flex day: full target (actual stays 0 -> negative)', () => {
    expect(dayInfo('2026-09-28', { date: '2026-09-28', type: 'flex_day' }, E).target).toBe(480)
  })

  it('target override wins, even on weekends', () => {
    expect(dayInfo('2026-12-24', { date: '2026-12-24', type: 'work', targetOverride: 240 }, E).target).toBe(240)
    expect(dayInfo('2026-10-03', { date: '2026-10-03', type: 'work', targetOverride: 120 }, E).target).toBe(120)
  })

  it('absence on a holiday or weekend has no effect', () => {
    expect(dayInfo('2026-06-04', { date: '2026-06-04', type: 'flex_day' }, E).target).toBe(0)
  })

  it('respects configured workdays', () => {
    const fourDays = { ...E, workdays: [1, 2, 3, 4] }
    expect(dayInfo('2026-10-02', undefined, fourDays).target).toBe(0) // Friday
  })
})
