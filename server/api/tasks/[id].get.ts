import { asc, eq } from 'drizzle-orm'
import { task, block, account } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [taskRow] = await db.select(taskWithSums)
    .from(task)
    .leftJoin(block, eq(block.taskId, task.id))
    .where(eq(task.id, id))
    .groupBy(task.id)
  if (!taskRow) notFound('Aufgabe')

  const [accountRow] = await db.select().from(account).where(eq(account.id, taskRow.accountId))
  const blocks = await db.select().from(block).where(eq(block.taskId, id)).orderBy(asc(block.date), asc(block.start))
  return { ...taskRow, account: accountRow!, blocks }
})
