import { and, gte, inArray, lte } from 'drizzle-orm'
import { z } from 'zod'
import { tag } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'

const schema = z.object({ von: datumSchema, bis: datumSchema }).refine(b => b.von <= b.bis, 'Ungültiger Zeitraum')

// Heute-Banner: Urlaub als bestätigt markieren (Übergabe erledigt) – betrifft alle Urlaubstage im Zeitraum
export default defineEventHandler(async (event) => {
  const { von, bis } = await readValidatedBody(event, schema.parse)
  await db.update(tag).set({ bestaetigt: true })
    .where(and(gte(tag.datum, von), lte(tag.datum, bis), inArray(tag.typ, ['urlaub', 'halb_urlaub'])))
  return { ok: true }
})
