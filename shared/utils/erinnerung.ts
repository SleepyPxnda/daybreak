import type { BlockBasis } from './bloecke'
import { istMinuten } from './bloecke'
import { formatDauer, formatUhrzeit } from './zeit'

export type ErinnerungArt = 'luecke' | 'feierabend'

/** Zweite (und letzte) Feierabend-Erinnerung so viele Minuten nach der ersten Uhrzeit. */
const FEIERABEND_NACHFASSEN_MIN = 60

export interface ErinnerungEingabe {
  /** Minuten seit Mitternacht */
  jetzt: number
  sollMin: number
  bloecke: Pick<BlockBasis, 'start' | 'ende' | 'kind' | 'status'>[]
  arbeitsbeginn: number
  /** Ab so vielen Minuten ohne gebuchte Zeit wird erinnert – zugleich Mindestabstand zwischen zwei Lücken-Erinnerungen */
  lueckeMin: number
  /** Uhrzeit, ab der an fehlende Zeit zum Soll erinnert wird */
  feierabend: number
  /** Minute der letzten Erinnerung je Art (heute) */
  zuletzt: Partial<Record<ErinnerungArt, number>>
}

export interface Erinnerung {
  art: ErinnerungArt
  titel: string
  text: string
}

/** Welche Erinnerung jetzt fällig ist – höchstens eine, sonst null. Bedingungen lösen sich durch Nachbuchen von selbst auf. */
export function pruefeErinnerung(e: ErinnerungEingabe): Erinnerung | null {
  if (e.sollMin <= 0) return null
  const ist = istMinuten(e.bloecke)
  if (ist >= e.sollMin) return null

  if (e.jetzt >= e.feierabend) {
    const zuletzt = e.zuletzt.feierabend
    const nachfassen = e.feierabend + FEIERABEND_NACHFASSEN_MIN
    const faellig = zuletzt === undefined || (zuletzt < nachfassen && e.jetzt >= nachfassen)
    if (!faellig) return null
    return {
      art: 'feierabend',
      titel: 'Tagesabschluss',
      text: `Heute ${formatDauer(ist)} von ${formatDauer(e.sollMin)} gebucht – Tagesabschluss machen?`,
    }
  }

  const gebuchteEnden = e.bloecke.filter(b => b.status === 'gebucht').map(b => b.ende)
  const seit = Math.max(e.arbeitsbeginn, ...gebuchteEnden)
  if (e.jetzt - seit < e.lueckeMin) return null
  const zuletzt = e.zuletzt.luecke
  if (zuletzt !== undefined && e.jetzt - zuletzt < e.lueckeMin) return null
  return {
    art: 'luecke',
    titel: 'Zeit nachtragen',
    text: gebuchteEnden.length
      ? `Seit ${formatUhrzeit(seit)} nichts gebucht – kurz nachtragen?`
      : 'Heute noch nichts gebucht – kurz nachtragen?',
  }
}
