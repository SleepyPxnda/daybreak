import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'

// Day closing "adopt plan": planned blocks of a day -> booked (optionally only specific ones)
const schema = z.object({
  date: dateSchema,
  ids: z.array(z.number().int().positive()).optional(),
})

export default defineEventHandler(async (event) => {
  const { date, ids } = await readValidatedBody(event, schema.parse)
  const filter = [eq(block.date, date), eq(block.status, 'geplant')]
  if (ids) filter.push(inArray(block.id, ids))
  return db.update(block).set({ status: 'gebucht' }).where(and(...filter)).returning()
})
