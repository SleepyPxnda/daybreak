import { eq } from 'drizzle-orm'
import { vacationEntitlement } from '../../../db/schema'
import { db } from '../../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [deleted] = await db.delete(vacationEntitlement).where(eq(vacationEntitlement.id, id)).returning()
  return deleted ?? notFound('Posten')
})
