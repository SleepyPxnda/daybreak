import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'

// Tagesabschluss „Plan übernehmen“: geplante Blöcke eines Tages → gebucht (optional nur bestimmte)
const schema = z.object({
  datum: datumSchema,
  ids: z.array(z.number().int().positive()).optional(),
})

export default defineEventHandler(async (event) => {
  const { datum, ids } = await readValidatedBody(event, schema.parse)
  const filter = [eq(block.datum, datum), eq(block.status, 'geplant')]
  if (ids) filter.push(inArray(block.id, ids))
  return db.update(block).set({ status: 'gebucht' }).where(and(...filter)).returning()
})
