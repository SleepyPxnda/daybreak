import { getHolidays } from 'feiertagejs'
import type { Datum } from './zeit'
import { wochentag } from './zeit'

export type TagTyp = 'arbeit' | 'urlaub' | 'halb_urlaub' | 'krank' | 'gleittag'

/** Gespeicherte Abweichung eines Tages (Tabelle `tag`). */
export interface TagEintrag {
  datum: Datum
  typ: TagTyp
  sollOverride?: number | null
}

export interface SollEinstellungen {
  sollProTagMin: number
  /** ISO-Wochentage 1 = Mo … 7 = So */
  arbeitstage: number[]
  bundesland: string
}

export interface TagesInfo {
  datum: Datum
  soll: number
  /** Regulärer Arbeitstag laut Wochentag, kein Feiertag */
  istArbeitstag: boolean
  /** Name des Feiertags, falls einer ist */
  feiertag?: string
  /** Gespeicherter Tagestyp (nur an Arbeitstagen wirksam) */
  typ: TagTyp
}

type Region = Parameters<typeof getHolidays>[1]

const feiertagCache = new Map<string, Map<Datum, string>>()

function feiertageImJahr(jahr: number, bundesland: string): Map<Datum, string> {
  const key = `${jahr}|${bundesland}`
  let tage = feiertagCache.get(key)
  if (!tage) {
    tage = new Map(getHolidays(jahr, bundesland as Region).map(h => [h.dateString, h.translate('de') ?? h.name]))
    feiertagCache.set(key, tage)
  }
  return tage
}

export function feiertagName(datum: Datum, bundesland: string): string | undefined {
  return feiertageImJahr(Number(datum.slice(0, 4)), bundesland).get(datum)
}

/**
 * Soll eines Tages (Plan §3.3).
 * - Soll-Override gewinnt immer.
 * - Wochenende/Feiertag: 0, Abwesenheiten wirken dort nicht.
 * - Arbeitstag: arbeit/gleittag = volles Soll, halb_urlaub = halbes, urlaub/krank = 0.
 */
export function tagesInfo(datum: Datum, eintrag: TagEintrag | undefined, einstellungen: SollEinstellungen): TagesInfo {
  const feiertag = feiertagName(datum, einstellungen.bundesland)
  const istArbeitstag = !feiertag && einstellungen.arbeitstage.includes(wochentag(datum))
  const typ = eintrag?.typ ?? 'arbeit'

  let soll = 0
  if (istArbeitstag) {
    switch (typ) {
      case 'arbeit':
      case 'gleittag':
        soll = einstellungen.sollProTagMin
        break
      case 'halb_urlaub':
        soll = Math.round(einstellungen.sollProTagMin / 2)
        break
      case 'urlaub':
      case 'krank':
        soll = 0
        break
    }
  }
  if (eintrag?.sollOverride != null) soll = eintrag.sollOverride

  return { datum, soll, istArbeitstag, feiertag, typ }
}
