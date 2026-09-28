import { describe, expect, it } from 'vitest'
import { alterText, istFaellig, plusArbeitstage, sortiereTodos, tageSeit } from '../shared/utils/todos'
import type { TodoBasis } from '../shared/utils/todos'

const E = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

describe('plusArbeitstage', () => {
  it('überspringt Wochenenden', () => {
    expect(plusArbeitstage('2026-09-28', 3, E)).toBe('2026-10-01') // Mo → Do
    expect(plusArbeitstage('2026-10-01', 3, E)).toBe('2026-10-06') // Do → Di
  })

  it('überspringt Feiertage (BW)', () => {
    // Mi 3.6.2026 + 1 Arbeitstag: Do 4.6. Fronleichnam → Fr 5.6.
    expect(plusArbeitstage('2026-06-03', 1, E)).toBe('2026-06-05')
  })
})

describe('Fälligkeit & Alter', () => {
  it('warten: fällig ab Nachfass-Datum', () => {
    expect(istFaellig({ art: 'warten', nachfassenAm: '2026-09-28' }, '2026-09-28')).toBe(true)
    expect(istFaellig({ art: 'warten', nachfassenAm: '2026-09-29' }, '2026-09-28')).toBe(false)
    expect(istFaellig({ art: 'warten', nachfassenAm: null }, '2026-09-28')).toBe(false)
  })

  it('merker: fällig ab Fälligkeit, daily nie', () => {
    expect(istFaellig({ art: 'merker', faelligAm: '2026-09-27' }, '2026-09-28')).toBe(true)
    expect(istFaellig({ art: 'daily', faelligAm: '2026-09-27' }, '2026-09-28')).toBe(false)
  })

  it('Alter in Tagen', () => {
    expect(tageSeit('2026-09-23T10:00:00.000Z', '2026-09-28')).toBe(5)
    expect(alterText(5)).toBe('seit 5 Tagen')
    expect(alterText(1)).toBe('seit gestern')
    expect(alterText(0)).toBe('seit heute')
  })
})

describe('sortiereTodos', () => {
  const t = (id: number, sortierung: number, nachfassenAm: string | null = null): TodoBasis =>
    ({ id, art: 'warten', sortierung, nachfassenAm, erstelltAm: '2026-09-01T00:00:00Z' })

  it('fällige oben (ältester Stichtag zuerst), Rest nach Sortierung', () => {
    const liste = [t(1, 0), t(2, 1, '2026-09-27'), t(3, 2), t(4, 3, '2026-09-20'), t(5, 4, '2026-10-05')]
    expect(sortiereTodos(liste, '2026-09-28').map(x => x.id)).toEqual([4, 2, 1, 3, 5])
  })
})
