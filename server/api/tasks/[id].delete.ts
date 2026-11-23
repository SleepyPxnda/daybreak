import { eq } from 'drizzle-orm'
import { task, block, template, note } from '../../db/schema'
import { db } from '../../db/client'

// A task with blocks cannot be deleted, only closed.
export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [hasBlock] = await db.select({ id: block.id }).from(block).where(eq(block.taskId, id)).limit(1)
  const [hasTemplate] = await db.select({ id: template.id }).from(template).where(eq(template.taskId, id)).limit(1)
  if (hasBlock || hasTemplate) {
    throw createError({ statusCode: 409, statusMessage: 'Aufgabe hat Blöcke – bitte abschließen statt löschen' })
  }
  const [existing] = await db.select({ accountId: task.accountId }).from(task).where(eq(task.id, id))
  if (!existing) notFound('Aufgabe')
  // Linked notes stay: they move to the task's account
  await db.update(note).set({ taskId: null, accountId: existing.accountId }).where(eq(note.taskId, id))
  const [deleted] = await db.delete(task).where(eq(task.id, id)).returning()
  return deleted ?? notFound('Aufgabe')
})
