import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, block, account } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'
import { addDays } from '#shared/utils/time'

const querySchema = z.object({ date: dateSchema })

// Day closing suggestions: most recently booked tasks and accounts of the last 14 days
export default defineEventHandler(async (event) => {
  const { date } = await getValidatedQuery(event, querySchema.parse)
  const rows = await db.select({
    taskId: block.taskId,
    accountId: block.accountId,
    recent: sql<string>`max(${block.date})`,
    taskKey: task.key,
    taskTitle: task.title,
    taskStatus: task.status,
    accountName: account.name,
    accountColor: account.color,
    accountStatus: account.status,
  })
    .from(block)
    .leftJoin(task, eq(task.id, block.taskId))
    .innerJoin(account, eq(account.id, block.accountId))
    .where(and(eq(block.kind, 'work'), eq(block.status, 'booked'), gte(block.date, addDays(date, -14)), lte(block.date, date)))
    .groupBy(block.taskId, block.accountId)
    .orderBy(desc(sql`max(${block.date})`), desc(sql`max(${block.id})`))

  return rows
    .filter(z => z.accountStatus === 'active' && (z.taskId === null || z.taskStatus === 'open'))
    .slice(0, 8)
})
