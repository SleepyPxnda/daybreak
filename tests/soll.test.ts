import { describe, expect, it } from 'vitest'
import { feiertagName, tagesInfo } from '../shared/utils/soll'
import type { SollEinstellungen } from '../shared/utils/soll'

const E: SollEinstellungen = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

describe('feiertagName (BW)', () => {
  it('erkennt BW-Feiertage 2026', () => {
    expect(feiertagName('2026-01-06', 'BW')).toBeDefined() // Heilige Drei Könige
    expect(feiertagName('2026-04-03', 'BW')).toBeDefined() // Karfreitag
    expect(feiertagName('2026-06-04', 'BW')).toBeDefined() // Fronleichnam
    expect(feiertagName('2026-11-01', 'BW')).toBeDefined() // Allerheiligen
  })

  it('kennt keine Feiertage anderer Länder', () => {
    expect(feiertagName('2026-10-31', 'BW')).toBeUndefined() // Reformationstag (nicht BW)
    expect(feiertagName('2026-09-28', 'BW')).toBeUndefined()
  })
})

describe('tagesInfo', () => {
  it('Arbeitstag: volles Soll', () => {
    expect(tagesInfo('2026-09-28', undefined, E)).toMatchObject({ soll: 480, istArbeitstag: true, typ: 'arbeit' })
  })

  it('Wochenende: 0', () => {
    expect(tagesInfo('2026-10-03', undefined, E)).toMatchObject({ soll: 0, istArbeitstag: false })
  })

  it('Feiertag BW an einem Werktag: 0 mit Namen', () => {
    const info = tagesInfo('2026-06-04', undefined, E)
    expect(info.soll).toBe(0)
    expect(info.istArbeitstag).toBe(false)
    expect(info.feiertag).toBeTruthy()
  })

  it('Urlaub und Krank: 0', () => {
    expect(tagesInfo('2026-09-28', { datum: '2026-09-28', typ: 'urlaub' }, E).soll).toBe(0)
    expect(tagesInfo('2026-09-28', { datum: '2026-09-28', typ: 'krank' }, E).soll).toBe(0)
  })

  it('½ Urlaub: halbes Soll', () => {
    expect(tagesInfo('2026-09-28', { datum: '2026-09-28', typ: 'halb_urlaub' }, E).soll).toBe(240)
  })

  it('Gleittag: volles Soll (Ist bleibt 0 → Minus)', () => {
    expect(tagesInfo('2026-09-28', { datum: '2026-09-28', typ: 'gleittag' }, E).soll).toBe(480)
  })

  it('Soll-Override gewinnt, auch am Wochenende', () => {
    expect(tagesInfo('2026-12-24', { datum: '2026-12-24', typ: 'arbeit', sollOverride: 240 }, E).soll).toBe(240)
    expect(tagesInfo('2026-10-03', { datum: '2026-10-03', typ: 'arbeit', sollOverride: 120 }, E).soll).toBe(120)
  })

  it('Abwesenheit am Feiertag/Wochenende wirkt nicht', () => {
    expect(tagesInfo('2026-06-04', { datum: '2026-06-04', typ: 'gleittag' }, E).soll).toBe(0)
  })

  it('respektiert konfigurierte Arbeitstage', () => {
    const vierTage = { ...E, arbeitstage: [1, 2, 3, 4] }
    expect(tagesInfo('2026-10-02', undefined, vierTage).soll).toBe(0) // Freitag
  })
})
