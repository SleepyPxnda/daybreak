import { describe, expect, it } from 'vitest'
import { kontostand, saldoVerlauf } from '../shared/utils/saldo'
import type { SaldoEingabe } from '../shared/utils/saldo'

const einstellungen = { sollProTagMin: 480, arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BW' }

function eingabe(teil: Partial<SaldoEingabe>): SaldoEingabe {
  return {
    start: { datum: '2026-06-01', saldoMin: 0 },
    heute: '2026-06-08',
    istProTag: {},
    tage: {},
    einstellungen,
    ...teil,
  }
}

// Woche 1.–7.6.2026: Mo–Mi Arbeit, Do 4.6. Fronleichnam (BW), Fr Arbeit, Sa/So frei. Heute = Mo 8.6.
const volleWoche = {
  '2026-06-01': 480,
  '2026-06-02': 480,
  '2026-06-03': 480,
  '2026-06-05': 480,
}

describe('kontostand', () => {
  it('ausgeglichene Woche mit Feiertag ergibt 0', () => {
    expect(kontostand(eingabe({ istProTag: volleWoche }))).toBe(0)
  })

  it('startet mit dem Startsaldo', () => {
    expect(kontostand(eingabe({ start: { datum: '2026-06-01', saldoMin: 195 }, istProTag: volleWoche }))).toBe(195)
  })

  it('Arbeit am Feiertag und Wochenende ist Plus', () => {
    expect(kontostand(eingabe({ istProTag: { ...volleWoche, '2026-06-04': 60, '2026-06-06': 120 } }))).toBe(180)
  })

  it('heute zählt nicht, auch nicht mit Buchungen', () => {
    expect(kontostand(eingabe({ istProTag: { ...volleWoche, '2026-06-08': 600 } }))).toBe(0)
  })

  it('Gleittag: −8h', () => {
    const tage = { '2026-06-05': { datum: '2026-06-05', typ: 'gleittag' as const } }
    const { '2026-06-05': _, ...ohneFreitag } = volleWoche
    expect(kontostand(eingabe({ istProTag: ohneFreitag, tage }))).toBe(-480)
  })

  it('½ Urlaub: 4h Soll', () => {
    const tage = { '2026-06-05': { datum: '2026-06-05', typ: 'halb_urlaub' as const } }
    expect(kontostand(eingabe({ istProTag: { ...volleWoche, '2026-06-05': 300 }, tage }))).toBe(60)
  })

  it('Urlaub: 0 Soll, keine Buchung nötig', () => {
    const tage = { '2026-06-05': { datum: '2026-06-05', typ: 'urlaub' as const } }
    const { '2026-06-05': _, ...ohneFreitag } = volleWoche
    expect(kontostand(eingabe({ istProTag: ohneFreitag, tage }))).toBe(0)
  })

  it('Soll-Override', () => {
    const tage = { '2026-06-05': { datum: '2026-06-05', typ: 'arbeit' as const, sollOverride: 240 } }
    expect(kontostand(eingabe({ istProTag: volleWoche, tage }))).toBe(240)
  })

  it('fehlende Buchungen an Arbeitstagen sind Minus', () => {
    expect(kontostand(eingabe({ istProTag: { '2026-06-01': 480 } }))).toBe(-3 * 480)
  })

  it('Startdatum in der Zukunft/heute: nur Startsaldo', () => {
    expect(kontostand(eingabe({ start: { datum: '2026-06-08', saldoMin: 30 } }))).toBe(30)
  })
})

describe('saldoVerlauf', () => {
  // Start Fr 29.5.2026, heute Mi 3.6. → Mai: nur 29.5. (Fr), Juni: 1.–2.6. (Mo, Di), laufend
  const verlaufEingabe = eingabe({
    start: { datum: '2026-05-29', saldoMin: 60 },
    heute: '2026-06-03',
    istProTag: { '2026-05-29': 540, '2026-06-01': 420, '2026-06-02': 480, '2026-06-03': 600 },
  })

  it('Monatsdelta und Stand am Monatsende', () => {
    expect(saldoVerlauf(verlaufEingabe)).toEqual([
      { monat: '2026-05', delta: 60, stand: 120, laufend: false },
      { monat: '2026-06', delta: -60, stand: 60, laufend: true },
    ])
  })

  it('letzter Stand entspricht dem Kontostand', () => {
    expect(saldoVerlauf(verlaufEingabe).at(-1)?.stand).toBe(kontostand(verlaufEingabe))
  })

  it('am Monatsersten: laufender Monat mit Delta 0', () => {
    const v = saldoVerlauf(eingabe({ start: { datum: '2026-05-29', saldoMin: 0 }, heute: '2026-06-01', istProTag: { '2026-05-29': 480 } }))
    expect(v).toEqual([
      { monat: '2026-05', delta: 0, stand: 0, laufend: false },
      { monat: '2026-06', delta: 0, stand: 0, laufend: true },
    ])
  })

  it('Start heute: nur laufender Monat mit Startsaldo', () => {
    expect(saldoVerlauf(eingabe({ start: { datum: '2026-06-08', saldoMin: 30 } }))).toEqual([
      { monat: '2026-06', delta: 0, stand: 30, laufend: true },
    ])
  })

  it('Start in der Zukunft: leer', () => {
    expect(saldoVerlauf(eingabe({ start: { datum: '2026-07-01', saldoMin: 30 } }))).toEqual([])
  })
})
