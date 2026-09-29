import type { SollEinstellungen, TagEintrag } from './soll'
import { tagesInfo } from './soll'
import type { Datum } from './zeit'
import { datumsBereich, plusTage } from './zeit'

export interface StundenkontoStart {
  datum: Datum
  saldoMin: number
}

export interface SaldoEingabe {
  start: StundenkontoStart
  /** Stichtag „heute“ – fließt nicht in den Kontostand ein */
  heute: Datum
  /** Gebuchte Arbeitsminuten je Tag */
  istProTag: Record<Datum, number>
  /** Gespeicherte Tagesabweichungen */
  tage: Record<Datum, TagEintrag>
  einstellungen: SollEinstellungen
}

export function tagesDelta(ist: number, soll: number): number {
  return ist - soll
}

/**
 * Plan §3.4: Kontostand = Startsaldo + Σ Tagesdelta (Startdatum … gestern).
 * Heute und zukünftige Tage zählen nicht.
 */
export function kontostand({ start, heute, istProTag, tage, einstellungen }: SaldoEingabe): number {
  const gestern = plusTage(heute, -1)
  let saldo = start.saldoMin
  for (const datum of datumsBereich(start.datum, gestern)) {
    const { soll } = tagesInfo(datum, tage[datum], einstellungen)
    saldo += tagesDelta(istProTag[datum] ?? 0, soll)
  }
  return saldo
}

export interface MonatsSaldo {
  /** 'YYYY-MM' */
  monat: string
  /** Σ Tagesdelta des Monats (nur Tage ab Startdatum bis gestern) */
  delta: number
  /** Kontostand am Monatsende – im laufenden Monat Stand bis gestern */
  stand: number
  /** Laufender Monat: noch nicht abgeschlossen */
  laufend: boolean
}

/**
 * Plan §3.4 Monatsansicht: Monatsdelta + Kontostand am Monatsende, vom Monat des Startdatums bis zum laufenden Monat.
 * Der Stand des letzten Monats entspricht `kontostand`.
 */
export function saldoVerlauf({ start, heute, istProTag, tage, einstellungen }: SaldoEingabe): MonatsSaldo[] {
  const gestern = plusTage(heute, -1)
  const heuteMonat = heute.slice(0, 7)
  const verlauf: MonatsSaldo[] = []
  let stand = start.saldoMin

  for (const datum of datumsBereich(start.datum, gestern)) {
    const monat = datum.slice(0, 7)
    let eintrag = verlauf.at(-1)
    if (eintrag?.monat !== monat) {
      eintrag = { monat, delta: 0, stand, laufend: monat === heuteMonat }
      verlauf.push(eintrag)
    }
    const { soll } = tagesInfo(datum, tage[datum], einstellungen)
    const delta = tagesDelta(istProTag[datum] ?? 0, soll)
    eintrag.delta += delta
    stand += delta
    eintrag.stand = stand
  }

  // Laufender Monat ohne abgeschlossenen Tag (z. B. heute = 1.) bzw. Start heute
  if (start.datum <= heute && verlauf.at(-1)?.monat !== heuteMonat)
    verlauf.push({ monat: heuteMonat, delta: 0, stand, laufend: true })

  return verlauf
}
