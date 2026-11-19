import { eq } from 'drizzle-orm'
import { block, templateException } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  return db.transaction(async (tx) => {
    const [deleted] = await tx.delete(block).where(eq(block.id, id)).returning()
    if (!deleted) notFound('Block')
    // A deleted single occurrence is remembered as skipped and not generated again
    if (deleted.templateId != null) {
      await tx.insert(templateException).values({ templateId: deleted.templateId, date: deleted.date }).onConflictDoNothing()
    }
    return deleted
  })
})
