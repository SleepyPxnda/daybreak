import { describe, expect, it } from 'vitest'
import { parseDatumToken, parseDauer, parseQuickInput, parseZeitraum } from '../shared/utils/quickInput'
import type { QiKontext } from '../shared/utils/quickInput'

// Mo 28.09.2026
const ctx: QiKontext = {
  heute: '2026-09-28',
  konten: [
    { id: 1, name: 'Projekt Apollo', aliase: ['apollo'], status: 'aktiv' },
    { id: 2, name: 'Wartung', aliase: [], status: 'aktiv' },
    { id: 3, name: 'Firmenmeeting', aliase: ['mtg'], status: 'aktiv' },
    { id: 4, name: 'Altprojekt', aliase: ['alt'], status: 'archiviert' },
  ],
  aufgaben: [
    { id: 10, key: 'PROJ-123', titel: 'Login-Refactoring', kontoId: 1, status: 'offen' },
    { id: 11, key: 'PROJ-124', titel: 'Logout-Button', kontoId: 1, status: 'offen' },
    { id: 12, key: null, titel: 'Server-Updates', kontoId: 2, status: 'offen' },
    { id: 13, key: 'OLD-1', titel: 'Login alt', kontoId: 2, status: 'abgeschlossen' },
  ],
}

const parse = (text: string) => parseQuickInput(text, ctx)

describe('parseDauer', () => {
  it.each([
    ['2h', 120], ['1.5h', 90], ['1,5h', 90], ['1h30', 90], ['1h30m', 90], ['45m', 45], ['90m', 90], ['30min', 30],
  ])('%s → %i', (token, minuten) => expect(parseDauer(token)).toBe(minuten))

  it('erkennt Nicht-Dauern', () => {
    expect(parseDauer('login')).toBeUndefined()
    expect(parseDauer('9:00')).toBeUndefined()
  })
})

describe('parseZeitraum', () => {
  it('liest Uhrzeitspannen', () => {
    expect(parseZeitraum('9:00-10:30')).toEqual({ start: 540, ende: 630 })
    expect(parseZeitraum('9-10')).toEqual({ start: 540, ende: 600 })
    expect(parseZeitraum('14:15–15')).toEqual({ start: 855, ende: 900 })
    expect(parseZeitraum('2h')).toBeUndefined()
  })
})

describe('parseDatumToken', () => {
  it('relative Tage', () => {
    expect(parseDatumToken('morgen', ctx.heute, 'vor')).toBe('2026-09-29')
    expect(parseDatumToken('gestern', ctx.heute, 'zurueck')).toBe('2026-09-27')
    expect(parseDatumToken('2026-10-01', ctx.heute, 'vor')).toBe('2026-10-01')
  })

  it('Wochentage: planen nach vorn, buchen zurück', () => {
    expect(parseDatumToken('di', ctx.heute, 'vor')).toBe('2026-09-29')
    expect(parseDatumToken('mo', ctx.heute, 'vor')).toBe('2026-10-05') // nächster Montag, nicht heute
    expect(parseDatumToken('mo', ctx.heute, 'zurueck')).toBe('2026-09-28') // heute
    expect(parseDatumToken('fr', ctx.heute, 'zurueck')).toBe('2026-09-25')
  })

  it('ignoriert andere Wörter', () => {
    expect(parseDatumToken('review', ctx.heute, 'vor')).toBeUndefined()
  })
})

describe('parseQuickInput – Beispiele aus Plan §3.8', () => {
  it('2h PROJ-123 Review → gebucht auf Aufgabe mit Notiz', () => {
    expect(parse('2h PROJ-123 Review')).toEqual({
      art: 'block', kind: 'arbeit', status: 'gebucht', datum: '2026-09-28',
      zeit: { dauer: 120 },
      ziel: { typ: 'aufgabe', aufgabeId: 10, kontoId: 1 },
      notiz: 'Review',
    })
  })

  it('Key ist case-insensitive', () => {
    expect(parse('2h proj-123')).toMatchObject({ ziel: { typ: 'aufgabe', aufgabeId: 10 } })
  })

  it('2h login → Fuzzy auf offenen Aufgabentitel', () => {
    expect(parse('2h login')).toMatchObject({ ziel: { typ: 'aufgabe', aufgabeId: 10 } })
  })

  it('Fuzzy: übriger Text wird Notiz', () => {
    expect(parse('1h login code review')).toMatchObject({ ziel: { aufgabeId: 10 }, notiz: 'code review' })
  })

  it('mehrdeutig → Kandidaten', () => {
    const r = parse('1h log')
    expect(r).toMatchObject({ art: 'block', kandidaten: [{ aufgabeId: 10 }, { aufgabeId: 11 }] })
    expect(r).not.toHaveProperty('ziel', expect.anything())
  })

  it('2h Neue Idee @apollo → neue Aufgabe im Konto', () => {
    expect(parse('2h Neue Idee @apollo')).toMatchObject({
      ziel: { typ: 'neueAufgabe', titel: 'Neue Idee', kontoId: 1 },
    })
  })

  it('@konto grenzt Fuzzy auf das Konto ein', () => {
    expect(parse('2h login @apollo')).toMatchObject({ ziel: { typ: 'aufgabe', aufgabeId: 10 } })
    expect(parse('2h server @apollo')).toMatchObject({ ziel: { typ: 'neueAufgabe', titel: 'server', kontoId: 1 } })
  })

  it('nur @konto → direkt aufs Konto', () => {
    expect(parse('1h @wartung')).toMatchObject({ ziel: { typ: 'konto', kontoId: 2 } })
  })

  it('9:00-10:30 mtg → feste Uhrzeit auf Konto per Alias', () => {
    expect(parse('9:00-10:30 mtg')).toEqual({
      art: 'block', kind: 'arbeit', status: 'gebucht', datum: '2026-09-28',
      zeit: { start: 540, ende: 630 },
      ziel: { typ: 'konto', kontoId: 3 },
      notiz: undefined,
    })
  })

  it('Fuzzy auf Konto-Namen', () => {
    expect(parse('30m wartung')).toMatchObject({ ziel: { typ: 'konto', kontoId: 2 } })
  })

  it('p 30m → Pause', () => {
    expect(parse('p 30m')).toEqual({
      art: 'block', kind: 'pause', status: 'gebucht', datum: '2026-09-28', zeit: { dauer: 30 }, notiz: undefined,
    })
  })

  it('plan 5h PROJ-123 morgen → geplant für morgen', () => {
    expect(parse('plan 5h PROJ-123 morgen')).toMatchObject({
      status: 'geplant', datum: '2026-09-29', zeit: { dauer: 300 }, ziel: { aufgabeId: 10 },
    })
  })

  it('plan mit Wochentag und ISO-Datum', () => {
    expect(parse('plan 2h PROJ-123 fr')).toMatchObject({ datum: '2026-10-02' })
    expect(parse('plan 2h PROJ-123 2026-10-07')).toMatchObject({ datum: '2026-10-07' })
  })

  it('buchen für gestern', () => {
    expect(parse('2h PROJ-123 gestern')).toMatchObject({ status: 'gebucht', datum: '2026-09-27' })
  })

  it('ohne Datumsangabe gilt der angezeigte Tag, relative Angaben bleiben relativ zu heute', () => {
    const anderer = { ...ctx, standardDatum: '2026-09-24' }
    expect(parseQuickInput('2h PROJ-123', anderer)).toMatchObject({ datum: '2026-09-24' })
    expect(parseQuickInput('2h PROJ-123 gestern', anderer)).toMatchObject({ datum: '2026-09-27' })
  })
})

describe('parseQuickInput – Merker, Daily, Warten auf (Plan §3.8)', () => {
  it('t Zertifikat verlängern → Merker', () => {
    expect(parse('t Zertifikat verlängern')).toEqual({ art: 'todo', todoArt: 'merker', text: 'Zertifikat verlängern' })
  })

  it('t … bis fr → Merker mit Fälligkeit', () => {
    expect(parse('t Zertifikat verlängern bis fr')).toEqual({ art: 'todo', todoArt: 'merker', text: 'Zertifikat verlängern', stichtag: '2026-10-02' })
  })

  it('d Deployment-Freeze ansprechen → Daily-Thema, „bis“ bleibt Text', () => {
    expect(parse('d Deployment-Freeze ansprechen')).toEqual({ art: 'todo', todoArt: 'daily', text: 'Deployment-Freeze ansprechen' })
    expect(parse('d warten bis morgen')).toMatchObject({ text: 'warten bis morgen' })
  })

  it('w Tim: PR-Review Login → Warten auf mit wer', () => {
    expect(parse('w Tim: PR-Review Login')).toEqual({ art: 'todo', todoArt: 'warten', text: 'PR-Review Login', wer: 'Tim' })
  })

  it('w … bis fr / bis 2026-10-02 → Nachfass-Datum', () => {
    expect(parse('w Tim: PR-Review Login bis fr')).toMatchObject({ wer: 'Tim', text: 'PR-Review Login', stichtag: '2026-10-02' })
    expect(parse('w Tim: PR-Review bis 2026-10-07')).toMatchObject({ stichtag: '2026-10-07' })
  })

  it('w ohne Doppelpunkt → nur Text', () => {
    expect(parse('w Rückmeldung Kunde')).toEqual({ art: 'todo', todoArt: 'warten', text: 'Rückmeldung Kunde' })
  })

  it('„bis“ ohne gültiges Datum bleibt Teil des Texts', () => {
    expect(parse('t Doku lesen bis Seite')).toMatchObject({ text: 'Doku lesen bis Seite' })
  })

  it('Präfix ohne Text → Fehler', () => {
    expect(parse('t')).toMatchObject({ art: 'fehler' })
    expect(parse('w Tim:')).toMatchObject({ art: 'fehler' })
  })

  it('Präfix ist case-insensitive', () => {
    expect(parse('T Merker')).toMatchObject({ art: 'todo', todoArt: 'merker' })
  })
})

describe('parseQuickInput – Notiz (Plan §3.8)', () => {
  it('n Architektur-Idee → neue Notiz mit Titel', () => {
    expect(parse('n Architektur-Idee')).toEqual({ art: 'notiz', titel: 'Architektur-Idee' })
    expect(parse('N Idee für später')).toEqual({ art: 'notiz', titel: 'Idee für später' })
  })

  it('n ohne Titel → Fehler', () => {
    expect(parse('n')).toMatchObject({ art: 'fehler' })
  })
})

describe('parseQuickInput – Filter und Fehler', () => {
  it('abgeschlossene Aufgaben und archivierte Konten nicht per Fuzzy/Alias', () => {
    expect(parse('1h alt')).toMatchObject({ art: 'fehler' })
    expect(parse('1h altprojekt')).toMatchObject({ art: 'fehler' })
  })

  it('exakter Key trifft auch abgeschlossene Aufgaben', () => {
    expect(parse('1h OLD-1')).toMatchObject({ ziel: { aufgabeId: 13 } })
  })

  it('kein Treffer → Fehler mit Hinweis auf @konto', () => {
    expect(parse('2h Neue Idee')).toMatchObject({ art: 'fehler', meldung: expect.stringContaining('@konto') })
  })

  it('unbekanntes @konto', () => {
    expect(parse('2h x @gibtsnicht')).toMatchObject({ art: 'fehler' })
  })

  it('Raster und Zeiträume werden geprüft', () => {
    expect(parse('1h10 PROJ-123')).toMatchObject({ art: 'fehler' })
    expect(parse('9:10-10:00 mtg')).toMatchObject({ art: 'fehler' })
    expect(parse('11:00-10:00 mtg')).toMatchObject({ art: 'fehler' })
  })

  it('gebucht in der Zukunft ist nicht erlaubt', () => {
    expect(parse('2h PROJ-123 morgen')).toMatchObject({ art: 'fehler' })
  })

  it('Präfix ohne Dauer ist ein Fehler', () => {
    expect(parse('p')).toMatchObject({ art: 'fehler' })
    expect(parse('plan PROJ-123')).toMatchObject({ art: 'fehler' })
  })

  it('ohne Dauer/Präfix → Suche', () => {
    expect(parse('login')).toEqual({ art: 'suche', text: 'login' })
    expect(parse('   ')).toEqual({ art: 'leer' })
  })
})
