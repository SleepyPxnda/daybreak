import type { SollEinstellungen } from './soll'
import { tagesInfo } from './soll'
import type { Datum } from './zeit'
import { plusTage, tageZwischen, zuDatum } from './zeit'

export type TodoArt = 'merker' | 'daily' | 'warten'

export const TODO_ARTEN: { art: TodoArt, titel: string, einzahl: string }[] = [
  { art: 'merker', titel: 'Merker', einzahl: 'Merker' },
  { art: 'warten', titel: 'Warten auf', einzahl: 'Warten auf' },
  { art: 'daily', titel: 'Daily-Themen', einzahl: 'Daily-Thema' },
]

/** Standard-Abstand für „nachgefasst“ (Plan §3.6) */
export const NACHFASSEN_ARBEITSTAGE = 3

export interface TodoBasis {
  id: number
  art: TodoArt
  sortierung: number
  nachfassenAm?: Datum | null
  faelligAm?: Datum | null
  erledigtAm?: string | null
  erstelltAm: string
}

/** Nächster Tag, der `n` reguläre Arbeitstage (ohne Wochenende/Feiertag) nach `datum` liegt. */
export function plusArbeitstage(datum: Datum, n: number, einstellungen: SollEinstellungen): Datum {
  let d = datum
  let rest = n
  while (rest > 0) {
    d = plusTage(d, 1)
    if (tagesInfo(d, undefined, einstellungen).istArbeitstag) rest--
  }
  return d
}

/** Das für die Hervorhebung relevante Datum: Nachfassen (warten) bzw. Fälligkeit (merker). */
export function stichtag(todo: Pick<TodoBasis, 'art' | 'nachfassenAm' | 'faelligAm'>): Datum | null {
  if (todo.art === 'warten') return todo.nachfassenAm ?? null
  if (todo.art === 'merker') return todo.faelligAm ?? null
  return null
}

export function istFaellig(todo: Pick<TodoBasis, 'art' | 'nachfassenAm' | 'faelligAm'>, heute: Datum): boolean {
  const tag = stichtag(todo)
  return tag !== null && tag <= heute
}

/** Alter in ganzen Tagen seit dem Anlegen („seit 5 Tagen“). erstelltAm ist ein ISO-Timestamp (UTC). */
export function tageSeit(erstelltAm: string, heute: Datum): number {
  return Math.max(0, tageZwischen(zuDatum(new Date(erstelltAm)), heute))
}

export function alterText(tage: number): string {
  if (tage === 0) return 'seit heute'
  if (tage === 1) return 'seit gestern'
  return `seit ${tage} Tagen`
}

/**
 * Anzeige-Reihenfolge: fällige/überfällige zuerst (ältester Stichtag oben), dann manuelle Sortierung.
 * Plan §3.6: „Warten auf“ ab dem Nachfass-Datum hervorgehoben und oben in der Liste.
 */
export function sortiereTodos<T extends TodoBasis>(todos: T[], heute: Datum): T[] {
  return [...todos].sort((a, b) => {
    const fa = istFaellig(a, heute)
    const fb = istFaellig(b, heute)
    if (fa !== fb) return fa ? -1 : 1
    if (fa && fb) {
      const diff = stichtag(a)!.localeCompare(stichtag(b)!)
      if (diff) return diff
    }
    return a.sortierung - b.sortierung || a.id - b.id
  })
}
