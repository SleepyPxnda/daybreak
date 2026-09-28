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
