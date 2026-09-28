import type { Datum } from './zeit'
import { istImRaster, TAG_MIN } from './zeit'

export type BlockKind = 'arbeit' | 'pause'
export type BlockStatus = 'geplant' | 'gebucht'

export interface Zeitraum {
  start: number
  ende: number
}

/** Minimale Block-Sicht für die Fachlogik. */
export interface BlockBasis extends Zeitraum {
  id?: number
  datum: Datum
  kind: BlockKind
  status: BlockStatus
}

export function dauer(z: Zeitraum): number {
  return z.ende - z.start
}

/** Start < Ende, innerhalb des Tages, im 15-min-Raster. */
export function istGueltigerZeitraum(z: Zeitraum): boolean {
  return istImRaster(z.start) && istImRaster(z.ende) && z.start >= 0 && z.ende <= TAG_MIN && z.start < z.ende
}

export function ueberlappt(a: Zeitraum, b: Zeitraum): boolean {
  return a.start < b.ende && b.start < a.ende
}

/** Erster Block, mit dem `neu` kollidiert (Blöcke mit `ignoriereId` werden übersprungen). */
export function findeUeberlappung<T extends Zeitraum & { id?: number }>(
  bloecke: T[],
  neu: Zeitraum,
  ignoriereId?: number,
): T | undefined {
  return bloecke.find(b => b.id !== ignoriereId && ueberlappt(b, neu))
}

/** Plan §3.8: nach dem letzten Block des Tages, sonst ab Arbeitsbeginn. */
export function naechsterFreierSlot(bloecke: Zeitraum[], arbeitsbeginn: number): number {
  if (bloecke.length === 0) return arbeitsbeginn
  return Math.max(...bloecke.map(b => b.ende))
}

/** Ist-Zeit = Summe gebuchter Arbeitsblöcke (Pausen und geplante zählen nie). */
export function istMinuten(bloecke: Pick<BlockBasis, 'start' | 'ende' | 'kind' | 'status'>[]): number {
  return bloecke
    .filter(b => b.kind === 'arbeit' && b.status === 'gebucht')
    .reduce((summe, b) => summe + dauer(b), 0)
}

/** Geplante Arbeitszeit (für „daneben geplant“). */
export function geplantMinuten(bloecke: Pick<BlockBasis, 'start' | 'ende' | 'kind' | 'status'>[]): number {
  return bloecke
    .filter(b => b.kind === 'arbeit' && b.status === 'geplant')
    .reduce((summe, b) => summe + dauer(b), 0)
}

/** Teilt einen Zeitraum an `bei` (muss echt innerhalb liegen und im Raster sein). */
export function teileZeitraum(z: Zeitraum, bei: number): [Zeitraum, Zeitraum] | undefined {
  if (!istImRaster(bei) || bei <= z.start || bei >= z.ende) return undefined
  return [{ start: z.start, ende: bei }, { start: bei, ende: z.ende }]
}
