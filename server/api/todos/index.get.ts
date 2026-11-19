import type { SQL } from 'drizzle-orm'
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { task, account, todo } from '../../db/schema'
import { db } from '../../db/client'

const querySchema = z.object({
  kind: z.enum(['reminder', 'daily_topic', 'waiting_for']).optional(),
  /** open (default) or done (archive) */
  status: z.enum(['open', 'done']).default('open'),
  taskId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = [query.status === 'open' ? isNull(todo.doneAt) : isNotNull(todo.doneAt)]
  if (query.kind) filter.push(eq(todo.kind, query.kind))
  if (query.taskId) filter.push(eq(todo.taskId, query.taskId))

  return db.select(todoWithReference)
    .from(todo)
    .leftJoin(task, eq(task.id, todo.taskId))
    .leftJoin(account, eq(account.id, todo.accountId))
    .where(and(...filter))
    .orderBy(...(query.status === 'open' ? [asc(todo.sortOrder), asc(todo.id)] : [desc(todo.doneAt)]))
    .limit(query.status === 'open' ? 500 : 200)
})
