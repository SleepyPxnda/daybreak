import type { SollEinstellungen, TagEintrag, TagesInfo } from './soll'
import { tagesInfo } from './soll'
import type { Datum } from './zeit'
import { datumsBereich, plusTage, tageZwischen } from './zeit'

export type PostenArt = 'grund' | 'zusatz' | 'rest'

export interface UrlaubsPosten {
  art: PostenArt
  bezeichnung: string
  /** in 0,5-Schritten */
  tage: number
}

export interface Urlaubskonto {
  jahr: number
  /** Summe aller Posten */
  anspruch: number
  /** Urlaubstage bis einschließlich heute */
  genommen: number
  /** Urlaubstage nach heute */
  geplant: number
  /** anspruch − genommen − geplant */
  rest: number
}

/**
 * Plan §3.5: Beim ersten Start vorbelegt – Grundanspruch 32 + zwei Semester-Zusatzposten à 2.
 * Bezeichnungen wie im Plan (2026: „WS 26/27“, „SS 27“); in den Einstellungen änderbar.
 */
export function vorbelegungUrlaub(jahr: number): UrlaubsPosten[] {
  const kurz = (j: number) => String(j % 100).padStart(2, '0')
  return [
    { art: 'grund', bezeichnung: 'Grundanspruch', tage: 32 },
    { art: 'zusatz', bezeichnung: `Sonderurlaub WS ${kurz(jahr)}/${kurz(jahr + 1)}`, tage: 2 },
    { art: 'zusatz', bezeichnung: `Sonderurlaub SS ${kurz(jahr + 1)}`, tage: 2 },
  ]
}

/**
 * Wie viele Urlaubstage verbraucht ein Tag? Urlaub = 1, ½ Urlaub = 0,5 – aber nur an regulären
 * Arbeitstagen (Plan §3.5: Urlaub an Wochenenden/Feiertagen zählt nicht).
 */
export function urlaubstage(info: Pick<TagesInfo, 'typ' | 'istArbeitstag'>): number {
  if (!info.istArbeitstag) return 0
  if (info.typ === 'urlaub') return 1
  if (info.typ === 'halb_urlaub') return 0.5
  return 0
}

/** Urlaubskonto eines Jahres aus Posten und gespeicherten Tagen. */
export function urlaubskonto(
  jahr: number,
  posten: Pick<UrlaubsPosten, 'tage'>[],
  tage: Record<Datum, TagEintrag>,
  heute: Datum,
  einstellungen: SollEinstellungen,
): Urlaubskonto {
  const anspruch = posten.reduce((summe, p) => summe + p.tage, 0)
  let genommen = 0
  let geplant = 0
  for (const eintrag of Object.values(tage)) {
    if (!eintrag.datum.startsWith(`${jahr}-`)) continue
    const wert = urlaubstage(tagesInfo(eintrag.datum, eintrag, einstellungen))
    if (eintrag.datum <= heute) genommen += wert
    else geplant += wert
  }
  return { jahr, anspruch, genommen, geplant, rest: anspruch - genommen - geplant }
}

export interface NaechsterUrlaub {
  /** erster und letzter Urlaubstag des zusammenhängenden Zeitraums */
  von: Datum
  bis: Datum
  /** verbrauchte Urlaubstage im Zeitraum (½ Urlaub = 0,5) */
  urlaubstage: number
  /** Kalendertage bis zum Beginn (0 = heute bzw. läuft) */
  tageBis: number
  /** reguläre Arbeitstage zwischen heute (exkl.) und Beginn (exkl.) */
  arbeitstageBis: number
  /** heute liegt im Zeitraum */
  laeuft: boolean
}

/**
 * Nächster (oder laufender) Urlaub ab heute. Aufeinanderfolgende Urlaubstage bilden einen Zeitraum;
 * Wochenenden/Feiertage dazwischen überbrücken ihn, Arbeitstage ohne Urlaub beenden ihn.
 * @param maxTage Suchhorizont
 */
export function naechsterUrlaub(
  heute: Datum,
  tage: Record<Datum, TagEintrag>,
  einstellungen: SollEinstellungen,
  maxTage = 366,
): NaechsterUrlaub | null {
  const bis = plusTage(heute, maxTage)
  const infoVon = (d: Datum) => tagesInfo(d, tage[d], einstellungen)
  const istUrlaub = (d: Datum) => urlaubstage(infoVon(d)) > 0

  // Beginn: erster Urlaubstag ab heute – liegt heute mitten im Urlaub, zurück bis zu dessen Anfang
  let start: Datum | undefined
  for (let d = heute; d <= bis; d = plusTage(d, 1)) {
    if (istUrlaub(d)) {
      start = d
      break
    }
  }
  if (!start) return null

  // Liegen zwischen heute und dem Beginn nur freie Tage (z. B. heute = Samstag mitten im Urlaub),
  // gehört heute ggf. zu einem Urlaub, der schon vorher begonnen hat → Beginn rückwärts erweitern.
  const nurFreieTage = datumsBereich(heute, plusTage(start, -1)).every(d => !infoVon(d).istArbeitstag)
  if (nurFreieTage) {
    let d = plusTage(heute, -1)
    for (let i = 0; i < maxTage; i++, d = plusTage(d, -1)) {
      if (istUrlaub(d)) start = d
      else if (infoVon(d).istArbeitstag) break
    }
  }

  // Ende: weiter, solange Urlaub oder freie Tage folgen; letzter Urlaubstag zählt
  let ende = start
  let summe = 0
  for (let d = start; d <= bis; d = plusTage(d, 1)) {
    const info = infoVon(d)
    const wert = urlaubstage(info)
    if (wert > 0) {
      ende = d
      summe += wert
    }
    else if (info.istArbeitstag) {
      break
    }
  }

  const laeuft = start <= heute && heute <= ende
  let arbeitstageBis = 0
  if (!laeuft) {
    for (let d = plusTage(heute, 1); d < start; d = plusTage(d, 1)) {
      if (infoVon(d).istArbeitstag) arbeitstageBis++
    }
  }
  return { von: start, bis: ende, urlaubstage: summe, tageBis: laeuft ? 0 : tageZwischen(heute, start), arbeitstageBis, laeuft }
}

/** Alle Tage eines Jahres ('YYYY-01-01' … 'YYYY-12-31'). */
export function jahresTage(jahr: number): Datum[] {
  return datumsBereich(`${jahr}-01-01`, `${jahr}-12-31`)
}
