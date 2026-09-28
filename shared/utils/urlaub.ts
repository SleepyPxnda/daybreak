import type { SollEinstellungen, TagEintrag, TagesInfo } from './soll'
import { tagesInfo } from './soll'
import type { Datum } from './zeit'
import { datumsBereich } from './zeit'

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

/** Alle Tage eines Jahres ('YYYY-01-01' … 'YYYY-12-31'). */
export function jahresTage(jahr: number): Datum[] {
  return datumsBereich(`${jahr}-01-01`, `${jahr}-12-31`)
}
