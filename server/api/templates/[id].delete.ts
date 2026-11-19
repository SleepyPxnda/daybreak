import { and, eq, gt } from 'drizzle-orm'
import { block, template, templateException } from '../../db/schema'
import { db } from '../../db/client'
import { today } from '#shared/utils/time'

// Future planned occurrences disappear; past/booked blocks are kept as normal blocks.
export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  return db.transaction(async (tx) => {
    await tx.delete(block).where(and(eq(block.templateId, id), eq(block.status, 'planned'), gt(block.date, today())))
    await tx.update(block).set({ templateId: null }).where(eq(block.templateId, id))
    await tx.delete(templateException).where(eq(templateException.templateId, id))
    const [deleted] = await tx.delete(template).where(eq(template.id, id)).returning()
    return deleted ?? notFound('Vorlage')
  })
})
