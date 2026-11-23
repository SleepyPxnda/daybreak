import { eq } from 'drizzle-orm'
import { note } from '../../db/schema'
import { isContentChange } from '#shared/utils/notes'
import { db } from '../../db/client'

const schema = noteFields.partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(note).where(eq(note.id, id))
  if (!previous) notFound('Notiz')

  const values: Record<string, unknown> = { ...data }
  if (data.taskId !== undefined || data.accountId !== undefined) {
    const taskId = data.taskId !== undefined ? data.taskId : previous.taskId
    const accountId = data.taskId ? null : (data.accountId !== undefined ? data.accountId : previous.accountId)
    Object.assign(values, taskId == null && accountId == null
      ? { taskId: null, accountId: null }
      : await resolveAssignment({ kind: 'work', taskId, accountId }))
  }
  // Pinning alone does not count as a content change; compare the resolved values
  if (isContentChange(previous, { ...previous, ...values })) values.updatedAt = new Date().toISOString()

  const [changed] = await db.update(note).set(values).where(eq(note.id, id)).returning()
  return changed!
})
