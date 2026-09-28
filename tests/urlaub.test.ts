import { describe, expect, it } from 'vitest'
import type { TagEintrag } from '../shared/utils/soll'
import { jahresTage, naechsterUrlaub, urlaubskonto, urlaubstage, vorbelegungUrlaub } from '../shared/utils/urlaub'

const E = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

const tag = (datum: string, typ: TagEintrag['typ']): [string, TagEintrag] => [datum, { datum, typ }]

describe('urlaubstage', () => {
  it('Urlaub 1, ½ Urlaub 0,5, sonst 0 – nur an Arbeitstagen', () => {
    expect(urlaubstage({ typ: 'urlaub', istArbeitstag: true })).toBe(1)
    expect(urlaubstage({ typ: 'halb_urlaub', istArbeitstag: true })).toBe(0.5)
    expect(urlaubstage({ typ: 'krank', istArbeitstag: true })).toBe(0)
    expect(urlaubstage({ typ: 'urlaub', istArbeitstag: false })).toBe(0)
  })
})

describe('urlaubskonto', () => {
  const posten = vorbelegungUrlaub(2026)

  it('Vorbelegung: 32 + 2 + 2 = 36', () => {
    expect(posten.map(p => p.tage)).toEqual([32, 2, 2])
    expect(posten[1]!.bezeichnung).toBe('Sonderurlaub WS 26/27')
    expect(posten[2]!.bezeichnung).toBe('Sonderurlaub SS 27')
  })

  it('genommen bis heute (inkl.), geplant danach, Rest', () => {
    const tage = Object.fromEntries([
      tag('2026-08-10', 'urlaub'), // Mo
      tag('2026-08-11', 'halb_urlaub'),
      tag('2026-09-28', 'urlaub'), // heute
      tag('2026-12-21', 'urlaub'),
      tag('2026-12-22', 'urlaub'),
    ])
    expect(urlaubskonto(2026, posten, tage, '2026-09-28', E)).toEqual({
      jahr: 2026, anspruch: 36, genommen: 2.5, geplant: 2, rest: 31.5,
    })
  })

  it('Urlaub am Wochenende/Feiertag zählt nicht', () => {
    const tage = Object.fromEntries([
      tag('2026-10-03', 'urlaub'), // Samstag
      tag('2026-06-04', 'urlaub'), // Fronleichnam
      tag('2026-06-05', 'urlaub'), // Fr – zählt
    ])
    expect(urlaubskonto(2026, posten, tage, '2026-09-28', E).genommen).toBe(1)
  })

  it('ignoriert Tage anderer Jahre und andere Typen', () => {
    const tage = Object.fromEntries([tag('2025-12-29', 'urlaub'), tag('2026-03-02', 'krank'), tag('2026-03-03', 'gleittag')])
    expect(urlaubskonto(2026, posten, tage, '2026-09-28', E)).toMatchObject({ genommen: 0, geplant: 0, rest: 36 })
  })

  it('Rest kann negativ werden', () => {
    const tage = Object.fromEntries([tag('2026-09-28', 'urlaub')])
    expect(urlaubskonto(2026, [{ tage: 0 }], tage, '2026-09-28', E).rest).toBe(-1)
  })
})

describe('naechsterUrlaub', () => {
  const heute = '2026-09-28' // Mo

  it('kein Urlaub → null', () => {
    expect(naechsterUrlaub(heute, {}, E)).toBeNull()
  })

  it('Zeitraum über Wochenende und Feiertage hinweg', () => {
    // Mo 21.12. – Do 31.12.: Weihnachten (25./26.) Feiertage, Wochenende dazwischen; 2.1.2027 ist Samstag
    const tage = Object.fromEntries(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-02'].map(d => tag(d, 'urlaub')))
    expect(naechsterUrlaub(heute, tage, E)).toMatchObject({
      von: '2026-12-21',
      bis: '2026-12-31',
      urlaubstage: 8,
      tageBis: 84,
      laeuft: false,
    })
  })

  it('Arbeitstag ohne Urlaub beendet den Zeitraum', () => {
    const tage = Object.fromEntries([tag('2026-10-05', 'urlaub'), tag('2026-10-07', 'urlaub')]) // Mo, Mi
    expect(naechsterUrlaub(heute, tage, E)).toMatchObject({ von: '2026-10-05', bis: '2026-10-05', urlaubstage: 1 })
  })

  it('Arbeitstage bis zum Beginn (ohne heute und ohne Beginn)', () => {
    const tage = Object.fromEntries([tag('2026-10-05', 'urlaub')]) // nächster Mo
    expect(naechsterUrlaub(heute, tage, E)).toMatchObject({ tageBis: 7, arbeitstageBis: 4 }) // Di–Fr
  })

  it('laufender Urlaub: Beginn in der Vergangenheit, läuft = true', () => {
    const tage = Object.fromEntries(['2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29'].map(d => tag(d, 'urlaub'))) // Do–Di über WE
    expect(naechsterUrlaub(heute, tage, E)).toMatchObject({ von: '2026-09-24', bis: '2026-09-29', laeuft: true, tageBis: 0, urlaubstage: 4 })
  })

  it('heute = Wochenende mitten im Urlaub → läuft', () => {
    const tage = Object.fromEntries(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'].map(d => tag(d, 'urlaub'))) // Do–Di
    expect(naechsterUrlaub('2026-10-03', tage, E)).toMatchObject({ von: '2026-10-01', bis: '2026-10-06', laeuft: true })
  })

  it('Wochenende vor Urlaubsbeginn ohne vorherigen Urlaub → läuft nicht', () => {
    const tage = Object.fromEntries([tag('2026-10-05', 'urlaub')])
    expect(naechsterUrlaub('2026-10-03', tage, E)).toMatchObject({ von: '2026-10-05', laeuft: false, tageBis: 2, arbeitstageBis: 0 })
  })

  it('ohne Arbeitstage keine Endlosschleife', () => {
    const tage = Object.fromEntries([tag('2026-10-05', 'urlaub')])
    expect(naechsterUrlaub(heute, tage, { ...E, arbeitstage: [] })).toBeNull()
  })

  it('½ Urlaub zählt als Urlaub mit 0,5', () => {
    const tage = Object.fromEntries([tag('2026-10-02', 'halb_urlaub')])
    expect(naechsterUrlaub(heute, tage, E)).toMatchObject({ von: '2026-10-02', urlaubstage: 0.5 })
  })

  it('Krank/Gleittag sind kein Urlaub', () => {
    const tage = Object.fromEntries([tag('2026-10-01', 'krank'), tag('2026-10-02', 'gleittag')])
    expect(naechsterUrlaub(heute, tage, E)).toBeNull()
  })
})

describe('jahresTage', () => {
  it('365 bzw. 366 Tage', () => {
    expect(jahresTage(2026)).toHaveLength(365)
    expect(jahresTage(2028)).toHaveLength(366)
  })
})
