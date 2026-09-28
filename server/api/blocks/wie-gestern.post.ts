import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { findeUeberlappung } from '#shared/utils/bloecke'
import { datumSchema } from '#shared/utils/einstellungen'
import { plusTage } from '#shared/utils/zeit'

const schema = z.object({ datum: datumSchema })

/**
 * „Wie gestern“ (Plan §5): gebuchte Blöcke des letzten Tages mit Buchungen (max. 7 Tage zurück,
 * damit es auch montags funktioniert) als *geplant* übernehmen. Belegte Zeiträume werden übersprungen.
 */
export default defineEventHandler(async (event) => {
  const { datum } = await readValidatedBody(event, schema.parse)

  const [letzter] = await db.select({ datum: block.datum }).from(block)
    .where(and(eq(block.status, 'gebucht'), lt(block.datum, datum), gte(block.datum, plusTage(datum, -7))))
    .orderBy(desc(block.datum))
    .limit(1)
  if (!letzter) return { quelle: null, angelegt: [], uebersprungen: 0 }

  const quelle = await db.select().from(block)
    .where(and(eq(block.datum, letzter.datum), eq(block.status, 'gebucht')))
    .orderBy(asc(block.start))
  const belegt = await db.select({ start: block.start, ende: block.ende }).from(block).where(eq(block.datum, datum))

  const neu = []
  for (const b of quelle) {
    if (findeUeberlappung(belegt, b)) continue
    neu.push({ datum, start: b.start, ende: b.ende, kind: b.kind, status: 'geplant' as const, aufgabeId: b.aufgabeId, kontoId: b.kontoId, notiz: b.notiz })
    belegt.push(b)
  }
  const angelegt = neu.length ? await db.insert(block).values(neu).returning() : []
  return { quelle: letzter.datum, angelegt, uebersprungen: quelle.length - angelegt.length }
})
