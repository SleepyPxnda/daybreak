import type { SQL } from 'drizzle-orm'
import { and, asc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, block } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { plusTage } from '#shared/utils/zeit'

const querySchema = z.object({
  kontoId: z.coerce.number().int().positive().optional(),
  status: z.enum(['offen', 'abgeschlossen']).optional(),
  /**
   * Plan §5 „Aufgaben in Arbeit“: offen + gebucht in den letzten 14 Tagen oder geplant an diesem Tag.
   * Erweitert (Wunsch): auch in den letzten 14 Tagen neu angelegte, damit man sie auf die Timeline ziehen kann.
   */
  inArbeit: datumSchema.optional(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = []
  if (query.kontoId) filter.push(eq(aufgabe.kontoId, query.kontoId))
  if (query.status) filter.push(eq(aufgabe.status, query.status))

  if (query.inArbeit) {
    const tag = query.inArbeit
    const ab = plusTage(tag, -14)
    const aktive = db.selectDistinct({ id: block.aufgabeId }).from(block).where(or(
      and(eq(block.status, 'gebucht'), gte(block.datum, ab), lte(block.datum, tag)),
      and(eq(block.status, 'geplant'), eq(block.datum, tag)),
    ))
    // erstelltAm ist ein ISO-Timestamp – die ersten 10 Zeichen sind das Datum
    const neuAngelegt = and(gte(sql`substr(${aufgabe.erstelltAm}, 1, 10)`, ab), lte(sql`substr(${aufgabe.erstelltAm}, 1, 10)`, tag))
    filter.push(eq(aufgabe.status, 'offen'), or(inArray(aufgabe.id, aktive), neuAngelegt)!)
  }

  return db.select(aufgabeMitSummen)
    .from(aufgabe)
    .leftJoin(block, eq(block.aufgabeId, aufgabe.id))
    .where(and(...filter))
    .groupBy(aufgabe.id)
    .orderBy(asc(aufgabe.status), asc(aufgabe.titel))
})
