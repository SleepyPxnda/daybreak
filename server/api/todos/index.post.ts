import { eq, sql } from 'drizzle-orm'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, todoCreateSchema.parse)
  const data = cleanTodo(input.kind, input)
  if (data.taskId != null || data.accountId != null) {
    Object.assign(data, await resolveAssignment({ kind: 'arbeit', taskId: data.taskId, accountId: data.taskId ? null : data.accountId }))
  }

  // New entries go to the end of their list
  const [{ max } = { max: null }] = await db.select({ max: sql<number | null>`max(${todo.sortOrder})` }).from(todo).where(eq(todo.kind, data.kind))
  const [created] = await db.insert(todo).values({ ...data, sortOrder: (max ?? -1) + 1 }).returning()
  return created!
})
