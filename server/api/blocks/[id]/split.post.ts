import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../../db/schema'
import { db } from '../../../db/client'
import { splitTimeRange } from '#shared/utils/blocks'
import { timeSchema } from '#shared/utils/settings'

const schema = z.object({ at: timeSchema })

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const { at } = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(block).where(eq(block.id, id))
  if (!previous) notFound('Block')

  const split = splitTimeRange(previous, at)
  if (!split) throw createError({ statusCode: 400, statusMessage: 'Teilungspunkt muss innerhalb des Blocks liegen' })
  const [first, second] = split

  return db.transaction(async (tx) => {
    const [firstBlock] = await tx.update(block).set({ end: first.end }).where(eq(block.id, id)).returning()
    const { id: _id, createdAt: _createdAt, ...copy } = previous
    // The second part is a normal block - only the first stays the template occurrence
    const [secondBlock] = await tx.insert(block).values({ ...copy, ...second, templateId: null }).returning()
    return [firstBlock!, secondBlock!]
  })
})
