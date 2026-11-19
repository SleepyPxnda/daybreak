import { and, gte, inArray, lte } from 'drizzle-orm'
import { z } from 'zod'
import { day } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'

const schema = z.object({ from: dateSchema, to: dateSchema }).refine(b => b.from <= b.to, 'Ungültiger Zeitraum')

// Today banner: mark vacation as confirmed (handover done) - affects all vacation days in the range
export default defineEventHandler(async (event) => {
  const { from, to } = await readValidatedBody(event, schema.parse)
  await db.update(day).set({ confirmed: true })
    .where(and(gte(day.date, from), lte(day.date, to), inArray(day.type, ['urlaub', 'halb_urlaub'])))
  return { ok: true }
})
