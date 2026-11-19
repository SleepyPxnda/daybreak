import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

const schema = todoFields.partial().extend({
  /** done / discussed (true) or reopen (false) */
  done: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const { done, ...data } = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(todo).where(eq(todo.id, id))
  if (!previous) notFound('Eintrag')

  const kind = data.kind ?? previous.kind
  const values: Record<string, unknown> = cleanTodo(kind, data)
  // On a change of kind, clear fields that no longer fit
  if (data.kind && data.kind !== previous.kind) Object.assign(values, cleanTodo(kind, { person: previous.person, followUpDate: previous.followUpDate, dueDate: previous.dueDate }))

  if (data.taskId !== undefined || data.accountId !== undefined) {
    const taskId = data.taskId !== undefined ? data.taskId : previous.taskId
    const accountId = data.taskId ? null : (data.accountId !== undefined ? data.accountId : previous.accountId)
    Object.assign(values, taskId == null && accountId == null
      ? { taskId: null, accountId: null }
      : await resolveAssignment({ kind: 'work', taskId, accountId }))
  }
  if (done !== undefined) values.doneAt = done ? new Date().toISOString() : null

  const [changed] = await db.update(todo).set(values).where(eq(todo.id, id)).returning()
  return changed!
})
