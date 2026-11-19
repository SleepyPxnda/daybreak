import { eq } from 'drizzle-orm'
import { task, block, account, template } from '../../db/schema'
import { db } from '../../db/client'

// An account with blocks (or tasks) cannot be deleted, only archived.
export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [hasTask] = await db.select({ id: task.id }).from(task).where(eq(task.accountId, id)).limit(1)
  const [hasBlock] = await db.select({ id: block.id }).from(block).where(eq(block.accountId, id)).limit(1)
  const [hasTemplate] = await db.select({ id: template.id }).from(template).where(eq(template.accountId, id)).limit(1)
  if (hasTask || hasBlock || hasTemplate) {
    throw createError({ statusCode: 409, statusMessage: 'Konto wird verwendet – bitte archivieren statt löschen' })
  }
  const [deleted] = await db.delete(account).where(eq(account.id, id)).returning()
  return deleted ?? notFound('Konto')
})
