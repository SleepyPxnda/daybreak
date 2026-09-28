import { and, eq, ne } from 'drizzle-orm'
import { aufgabe, block, konto } from '../db/schema'
import { db } from '../db/client'
import type { BlockKind, Zeitraum } from '#shared/utils/bloecke'
import { findeUeberlappung, istGueltigerZeitraum } from '#shared/utils/bloecke'
import type { Datum } from '#shared/utils/zeit'
import { formatUhrzeit } from '#shared/utils/zeit'

type Executor = Pick<typeof db, 'select'>

export interface ZielEingabe {
  kind: BlockKind
  aufgabeId?: number | null
  kontoId?: number | null
}

/**
 * Plan §3.2: Arbeit braucht ein Konto; ist eine Aufgabe gesetzt, kommt das Konto von ihr.
 * Pausen haben weder Aufgabe noch Konto.
 */
export async function loeseZielAuf(eingabe: ZielEingabe, tx: Executor = db): Promise<{ aufgabeId: number | null, kontoId: number | null }> {
  if (eingabe.kind === 'pause') return { aufgabeId: null, kontoId: null }

  if (eingabe.aufgabeId != null) {
    const [a] = await tx.select({ kontoId: aufgabe.kontoId }).from(aufgabe).where(eq(aufgabe.id, eingabe.aufgabeId))
    if (!a) throw createError({ statusCode: 400, statusMessage: 'Aufgabe existiert nicht' })
    return { aufgabeId: eingabe.aufgabeId, kontoId: a.kontoId }
  }

  if (eingabe.kontoId == null) throw createError({ statusCode: 400, statusMessage: 'Arbeitsblock braucht Aufgabe oder Konto' })
  const [k] = await tx.select({ id: konto.id }).from(konto).where(eq(konto.id, eingabe.kontoId))
  if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  return { aufgabeId: null, kontoId: eingabe.kontoId }
}

/** Zeitraum gültig und frei (Plan §3.2: keine Überlappung). */
export async function pruefeZeitraum(datum: Datum, zeitraum: Zeitraum, ignoriereId?: number, tx: Executor = db) {
  if (!istGueltigerZeitraum(zeitraum)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum (15-min-Raster, Start vor Ende)' })
  }
  const tagesBloecke = await tx
    .select({ id: block.id, start: block.start, ende: block.ende })
    .from(block)
    .where(ignoriereId === undefined ? eq(block.datum, datum) : and(eq(block.datum, datum), ne(block.id, ignoriereId)))
  const kollision = findeUeberlappung(tagesBloecke, zeitraum)
  if (kollision) {
    throw createError({
      statusCode: 409,
      statusMessage: `Überschneidet sich mit Block ${formatUhrzeit(kollision.start)}–${formatUhrzeit(kollision.ende)}`,
    })
  }
}
