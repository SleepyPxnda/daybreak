import type { BlockKind, BlockStatus } from '#shared/utils/bloecke'

/** Block wie ihn GET /api/blocks liefert (inkl. Anzeige-Infos). */
export interface TimelineBlock {
  id: number
  datum: string
  start: number
  ende: number
  kind: BlockKind
  status: BlockStatus
  aufgabeId: number | null
  kontoId: number | null
  notiz: string | null
  vorlageId: number | null
  aufgabeKey: string | null
  aufgabeTitel: string | null
  kontoName: string | null
  kontoFarbe: string | null
}

/** Plan §3.2: Aufgaben-Titel (bzw. Key + Titel), sonst Konto-Name; Pausen heißen „Pause“. */
export function blockTitel(b: Pick<TimelineBlock, 'kind' | 'aufgabeKey' | 'aufgabeTitel' | 'kontoName'>): string {
  if (b.kind === 'pause') return 'Pause'
  if (b.aufgabeTitel) return b.aufgabeKey ? `${b.aufgabeKey} ${b.aufgabeTitel}` : b.aufgabeTitel
  return b.kontoName ?? '–'
}

/** MIME-Typ für Drag & Drop von Aufgaben auf die Timeline */
export const DRAG_AUFGABE = 'application/x-daybreak-aufgabe'

// --- Zoom & Verschieben ---------------------------------------------------

/** Sichtbarer Ausschnitt der Timeline in Minuten seit Mitternacht */
export interface Sicht {
  von: number
  bis: number
}

export const SICHT_MIN_SPANNE = 60
export const SICHT_MAX_SPANNE = 24 * 60

/** Verschiebt die Sicht um `delta` Minuten, ohne den Tag (0–24 Uhr) zu verlassen. */
export function verschiebeSicht(sicht: Sicht, delta: number): Sicht {
  const spanne = sicht.bis - sicht.von
  const von = Math.min(Math.max(sicht.von + delta, 0), SICHT_MAX_SPANNE - spanne)
  return { von, bis: von + spanne }
}

/**
 * Zoomt um `faktor` (< 1 rein, > 1 raus) so, dass die Minute `anker` an derselben Bildschirmstelle bleibt.
 * Spanne wird auf 1 h … 24 h begrenzt.
 */
export function zoomeSicht(sicht: Sicht, faktor: number, anker: number): Sicht {
  const spanne = sicht.bis - sicht.von
  const neueSpanne = Math.min(Math.max(spanne * faktor, SICHT_MIN_SPANNE), SICHT_MAX_SPANNE)
  const anteil = (anker - sicht.von) / spanne
  return verschiebeSicht({ von: anker - anteil * neueSpanne, bis: anker - anteil * neueSpanne + neueSpanne }, 0)
}

/** Abstand der Skalenlinien je nach Zoomstufe */
export function skalenSchritt(spanne: number): number {
  if (spanne <= 180) return 15
  if (spanne <= 480) return 30
  return 60
}
