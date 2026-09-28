import { describe, expect, it } from 'vitest'
import { tagesInfo } from '../shared/utils/soll'
import type { TagEintrag } from '../shared/utils/soll'
import { materialisiere, vorlageGiltAn } from '../shared/utils/vorlagen'
import type { MaterialisierungEingabe, VorlageRegel } from '../shared/utils/vorlagen'

const einstellungen = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

const daily: VorlageRegel = {
  id: 1,
  start: 570, // 09:30
  ende: 585, // 09:45
  wochentage: [1, 2, 3, 4, 5],
  intervallWochen: 1,
  gueltigAb: '2026-01-01',
  aktiv: true,
}

function eingabe(teil: Partial<MaterialisierungEingabe> & { tage?: Record<string, TagEintrag> } = {}): MaterialisierungEingabe {
  const { tage = {}, ...rest } = teil
  return {
    vorlagen: [daily],
    // Mo 1.6. – So 14.6.2026, Do 4.6. = Fronleichnam
    von: '2026-06-01',
    bis: '2026-06-14',
    heute: '2026-06-01',
    tagesInfo: d => tagesInfo(d, tage[d], einstellungen),
    ausnahmen: [],
    bestehend: [],
    ...rest,
  }
}

describe('vorlageGiltAn', () => {
  it('prüft Wochentage und Gültigkeit', () => {
    expect(vorlageGiltAn(daily, '2026-06-01')).toBe(true)
    expect(vorlageGiltAn(daily, '2026-06-06')).toBe(false) // Samstag
    expect(vorlageGiltAn({ ...daily, gueltigAb: '2026-06-02' }, '2026-06-01')).toBe(false)
    expect(vorlageGiltAn({ ...daily, gueltigBis: '2026-06-01' }, '2026-06-02')).toBe(false)
    expect(vorlageGiltAn({ ...daily, aktiv: false }, '2026-06-01')).toBe(false)
  })

  it('„jede 2. Woche“ zählt ab der Woche von gültig ab', () => {
    const jf = { ...daily, wochentage: [2], intervallWochen: 2, gueltigAb: '2026-06-03' } // Mi, Woche 1.–7.6.
    expect(vorlageGiltAn(jf, '2026-06-09')).toBe(false) // Di, Woche 2
    expect(vorlageGiltAn(jf, '2026-06-16')).toBe(true) // Di, Woche 3
    expect(vorlageGiltAn(jf, '2026-06-02')).toBe(false) // vor gültig ab
  })
})

describe('materialisiere – Daily Mo–Fr 09:30–09:45 (Abnahme Phase 1)', () => {
  it('genau ein Block pro Arbeitstag, keiner an Feiertag/Wochenende', () => {
    const { neu, konflikte } = materialisiere(eingabe())
    expect(neu.map(b => b.datum)).toEqual([
      '2026-06-01', '2026-06-02', '2026-06-03', // Do 4.6. Fronleichnam fehlt
      '2026-06-05',
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12',
    ])
    expect(neu.every(b => b.start === 570 && b.ende === 585 && b.vorlageId === 1)).toBe(true)
    expect(konflikte).toEqual([])
  })

  it('keine Blöcke an Urlaub, Krank, Gleittag', () => {
    const tage: Record<string, TagEintrag> = {
      '2026-06-01': { datum: '2026-06-01', typ: 'urlaub' },
      '2026-06-02': { datum: '2026-06-02', typ: 'krank' },
      '2026-06-03': { datum: '2026-06-03', typ: 'gleittag' },
      '2026-06-05': { datum: '2026-06-05', typ: 'halb_urlaub' },
    }
    const daten = materialisiere(eingabe({ bis: '2026-06-05', tage })).neu.map(b => b.datum)
    expect(daten).toEqual(['2026-06-05'])
  })

  it('erzeugt nichts doppelt, wenn der Block schon existiert', () => {
    const bestehend = [{ datum: '2026-06-01', start: 570, ende: 585, vorlageId: 1 }]
    const { neu } = materialisiere(eingabe({ bis: '2026-06-02', bestehend }))
    expect(neu.map(b => b.datum)).toEqual(['2026-06-02'])
  })

  it('erzeugt verschobenen Termin nicht neu (gleiche vorlageId, andere Uhrzeit)', () => {
    const bestehend = [{ datum: '2026-06-01', start: 600, ende: 615, vorlageId: 1 }]
    expect(materialisiere(eingabe({ bis: '2026-06-01', bestehend })).neu).toEqual([])
  })

  it('erzeugt einen gelöschten Einzeltermin nicht erneut', () => {
    const { neu } = materialisiere(eingabe({ bis: '2026-06-02', ausnahmen: [{ vorlageId: 1, datum: '2026-06-01' }] }))
    expect(neu.map(b => b.datum)).toEqual(['2026-06-02'])
  })

  it('belegter Zeitraum → Konflikt statt Block', () => {
    const bestehend = [{ datum: '2026-06-01', start: 540, ende: 600 }]
    const { neu, konflikte } = materialisiere(eingabe({ bis: '2026-06-01', bestehend }))
    expect(neu).toEqual([])
    expect(konflikte).toEqual([{ vorlageId: 1, datum: '2026-06-01' }])
  })

  it('höchstens 14 Tage in die Zukunft', () => {
    const { neu } = materialisiere(eingabe({ von: '2026-06-01', bis: '2026-07-31', heute: '2026-06-01' }))
    expect(neu.at(-1)?.datum).toBe('2026-06-15')
  })

  it('zwei sich überschneidende Vorlagen am selben Tag → zweite ist Konflikt', () => {
    const zweite = { ...daily, id: 2, start: 575 - 5, ende: 600 }
    const { neu, konflikte } = materialisiere(eingabe({ bis: '2026-06-01', vorlagen: [daily, zweite] }))
    expect(neu.map(b => b.vorlageId)).toEqual([1])
    expect(konflikte).toEqual([{ vorlageId: 2, datum: '2026-06-01' }])
  })
})
