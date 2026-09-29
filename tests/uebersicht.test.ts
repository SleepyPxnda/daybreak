import { describe, expect, it } from 'vitest'
import type { UebersichtBlock } from '../shared/utils/uebersicht'
import { gruppiereUebersicht, monatsabschluss } from '../shared/utils/uebersicht'

const apollo = { kontoId: 1, kontoName: 'Projekt Apollo', kontoFarbe: 'lavendel' }
const meeting = { kontoId: 2, kontoName: 'Firmenmeeting', kontoFarbe: 'mint' }
const login = { aufgabeId: 10, aufgabeKey: 'PROJ-123', aufgabeTitel: 'Login-Refactoring' }
const ohneAufgabe = { aufgabeId: null, aufgabeKey: null, aufgabeTitel: null }

function b(datum: string, start: number, ende: number, teil: Partial<UebersichtBlock> = {}): UebersichtBlock {
  return { datum, start, ende, kind: 'arbeit', status: 'gebucht', notiz: null, ...apollo, ...login, ...teil }
}

describe('gruppiereUebersicht', () => {
  it('gruppiert Konto → Aufgabe → Tage mit Summen', () => {
    const u = gruppiereUebersicht([
      b('2026-09-28', 540, 840),
      b('2026-09-29', 540, 840),
      b('2026-09-29', 900, 960, { ...meeting, ...ohneAufgabe }),
    ])
    expect(u.gesamt).toBe(660)
    expect(u.konten.map(k => [k.name, k.minuten])).toEqual([['Projekt Apollo', 600], ['Firmenmeeting', 60]])
    const aufgabe = u.konten[0]!.aufgaben[0]!
    expect(aufgabe.key).toBe('PROJ-123')
    expect(aufgabe.tage.map(t => [t.datum, t.minuten])).toEqual([['2026-09-28', 300], ['2026-09-29', 300]])
  })

  it('direkt aufs Konto gebuchte Zeit als Zeile ohne Aufgabe', () => {
    const u = gruppiereUebersicht([b('2026-09-28', 540, 600), b('2026-09-28', 600, 720, ohneAufgabe)])
    const aufgaben = u.konten[0]!.aufgaben
    expect(aufgaben.map(a => [a.aufgabeId, a.minuten])).toEqual([[null, 120], [10, 60]])
  })

  it('Anteile beziehen sich auf die Ebene darüber', () => {
    const u = gruppiereUebersicht([
      b('2026-09-28', 480, 720),
      b('2026-09-29', 480, 540, ohneAufgabe),
      b('2026-09-29', 540, 600, { ...meeting, ...ohneAufgabe }),
    ])
    expect(u.konten.map(k => k.anteil)).toEqual([300 / 360, 60 / 360])
    expect(u.konten[0]!.aufgaben.map(a => a.anteil)).toEqual([240 / 300, 60 / 300])
    expect(u.konten[0]!.aufgaben[0]!.tage[0]!.anteil).toBe(1)
  })

  it('ignoriert geplante Blöcke und Pausen', () => {
    const u = gruppiereUebersicht([
      b('2026-09-28', 480, 540, { status: 'geplant' }),
      b('2026-09-28', 720, 750, { kind: 'pause', kontoId: null, ...ohneAufgabe }),
    ])
    expect(u).toEqual({ gesamt: 0, konten: [] })
  })

  it('sammelt Block-Notizen je Tag ohne Duplikate', () => {
    const u = gruppiereUebersicht([
      b('2026-09-28', 480, 540, { notiz: 'Review' }),
      b('2026-09-28', 540, 600, { notiz: ' Review ' }),
      b('2026-09-28', 600, 660, { notiz: 'Tests' }),
      b('2026-09-28', 660, 720, { notiz: '' }),
    ])
    expect(u.konten[0]!.aufgaben[0]!.tage[0]!.notizen).toEqual(['Review', 'Tests'])
  })
})

describe('monatsabschluss', () => {
  const tag = { datum: '2026-09-28', soll: 480 }

  it('Start, Ende, Pause inkl. Lücken und Ist', () => {
    const [t] = monatsabschluss([
      b('2026-09-28', 480, 720), // 08:00–12:00
      b('2026-09-28', 720, 750, { kind: 'pause', kontoId: null, ...ohneAufgabe }), // Pausenblock 0:30
      b('2026-09-28', 780, 1020), // 13:00–17:00 (Lücke 12:30–13:00)
    ], [tag])
    expect(t).toMatchObject({ start: 480, ende: 1020, ist: 480, pause: 60, soll: 480 })
  })

  it('Konten summiert mit Keys, Titeln und Notizen ohne Duplikate', () => {
    const [t] = monatsabschluss([
      b('2026-09-28', 480, 600),
      b('2026-09-28', 600, 660, { aufgabeId: 11, aufgabeKey: null, aufgabeTitel: 'Doku' }),
      b('2026-09-28', 660, 720),
      b('2026-09-28', 720, 780, { ...meeting, ...ohneAufgabe, notiz: 'Jour fixe' }),
      b('2026-09-28', 780, 810, { ...meeting, ...ohneAufgabe }),
    ], [tag])
    expect(t!.konten).toEqual([
      { kontoId: 1, name: 'Projekt Apollo', farbe: 'lavendel', minuten: 240, bezeichnungen: ['PROJ-123', 'Doku'] },
      { kontoId: 2, name: 'Firmenmeeting', farbe: 'mint', minuten: 90, bezeichnungen: ['Jour fixe'] },
    ])
  })

  it('geplante Blöcke zählen nicht; Tag ohne Buchung bleibt leer', () => {
    const tage = monatsabschluss([b('2026-09-28', 480, 540, { status: 'geplant' })], [tag, { datum: '2026-09-29', soll: 480 }])
    expect(tage).toEqual([
      { datum: '2026-09-28', soll: 480, start: null, ende: null, ist: 0, pause: 0, konten: [] },
      { datum: '2026-09-29', soll: 480, start: null, ende: null, ist: 0, pause: 0, konten: [] },
    ])
  })
})
