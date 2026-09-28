import { differenceInCalendarWeeks } from 'date-fns'
import type { Zeitraum } from './bloecke'
import { ueberlappt } from './bloecke'
import type { TagesInfo } from './soll'
import type { Datum } from './zeit'
import { datumsBereich, plusTage, wochentag, zuDate } from './zeit'

/** Wie weit Vorlagen maximal in die Zukunft materialisiert werden (Plan §3.2). */
export const VORLAGEN_HORIZONT_TAGE = 14

export interface VorlageRegel extends Zeitraum {
  id: number
  /** ISO-Wochentage 1 = Mo … 7 = So */
  wochentage: number[]
  intervallWochen: number
  gueltigAb: Datum
  gueltigBis?: Datum | null
  aktiv: boolean
}

export interface BestehenderBlock extends Zeitraum {
  datum: Datum
  vorlageId?: number | null
}

export interface MaterialisierungEingabe {
  vorlagen: VorlageRegel[]
  von: Datum
  bis: Datum
  heute: Datum
  tagesInfo: (datum: Datum) => TagesInfo
  /** Gelöschte Einzeltermine */
  ausnahmen: { vorlageId: number, datum: Datum }[]
  /** Alle Blöcke im Zeitraum (auch solche aus Vorlagen) */
  bestehend: BestehenderBlock[]
}

export interface MaterialisierungErgebnis {
  neu: (Zeitraum & { vorlageId: number, datum: Datum })[]
  /** Zeitraum belegt → nicht erzeugt (Hinweis-Badge am Tag) */
  konflikte: { vorlageId: number, datum: Datum }[]
}

/** Gilt die Vorlage an diesem Tag (ohne Blick auf Soll/Belegung)? */
export function vorlageGiltAn(vorlage: VorlageRegel, datum: Datum): boolean {
  if (!vorlage.aktiv) return false
  if (datum < vorlage.gueltigAb) return false
  if (vorlage.gueltigBis && datum > vorlage.gueltigBis) return false
  if (!vorlage.wochentage.includes(wochentag(datum))) return false
  const intervall = Math.max(1, vorlage.intervallWochen)
  const wochen = differenceInCalendarWeeks(zuDate(datum), zuDate(vorlage.gueltigAb), { weekStartsOn: 1 })
  return wochen % intervall === 0
}

/** Vorlagen erzeugen nur an regulären Arbeitstagen ohne ganztägige Abwesenheit. */
export function vorlagenErlaubtAn(info: TagesInfo): boolean {
  return info.istArbeitstag && (info.typ === 'arbeit' || info.typ === 'halb_urlaub')
}

/** Welche geplanten Blöcke fehlen im Zeitraum? Rein – schreibt nichts. */
export function materialisiere(eingabe: MaterialisierungEingabe): MaterialisierungErgebnis {
  const grenze = plusTage(eingabe.heute, VORLAGEN_HORIZONT_TAGE)
  const bis = eingabe.bis < grenze ? eingabe.bis : grenze
  const ausnahmen = new Set(eingabe.ausnahmen.map(a => `${a.vorlageId}|${a.datum}`))
  const vorhanden = new Set(eingabe.bestehend.filter(b => b.vorlageId != null).map(b => `${b.vorlageId}|${b.datum}`))

  const belegung = new Map<Datum, Zeitraum[]>()
  for (const b of eingabe.bestehend) {
    const liste = belegung.get(b.datum) ?? []
    liste.push(b)
    belegung.set(b.datum, liste)
  }

  const ergebnis: MaterialisierungErgebnis = { neu: [], konflikte: [] }
  for (const datum of datumsBereich(eingabe.von, bis)) {
    if (!vorlagenErlaubtAn(eingabe.tagesInfo(datum))) continue
    const tag = belegung.get(datum) ?? []
    for (const vorlage of eingabe.vorlagen) {
      const key = `${vorlage.id}|${datum}`
      if (!vorlageGiltAn(vorlage, datum) || vorhanden.has(key) || ausnahmen.has(key)) continue
      if (tag.some(b => ueberlappt(b, vorlage))) {
        ergebnis.konflikte.push({ vorlageId: vorlage.id, datum })
        continue
      }
      const block = { vorlageId: vorlage.id, datum, start: vorlage.start, ende: vorlage.ende }
      ergebnis.neu.push(block)
      tag.push(block)
      belegung.set(datum, tag)
    }
  }
  return ergebnis
}
