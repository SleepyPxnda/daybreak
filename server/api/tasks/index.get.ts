import type { SQL } from 'drizzle-orm'
import { and, asc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, block } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'
import { addDays } from '#shared/utils/time'

const querySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  status: z.enum(['open', 'closed']).optional(),
  /**
   * "Tasks in progress": open + booked in the last 14 days or planned on this day.
   * Extended: also tasks created in the last 14 days, so they can be dragged onto the timeline.
   */
  activeOn: dateSchema.optional(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = []
  if (query.accountId) filter.push(eq(task.accountId, query.accountId))
  if (query.status) filter.push(eq(task.status, query.status))

  if (query.activeOn) {
    const day = query.activeOn
    const since = addDays(day, -14)
    const active = db.selectDistinct({ id: block.taskId }).from(block).where(or(
      and(eq(block.status, 'booked'), gte(block.date, since), lte(block.date, day)),
      and(eq(block.status, 'planned'), eq(block.date, day)),
    ))
    // createdAt is an ISO timestamp - the first 10 characters are the date
    const newlyCreated = and(gte(sql`substr(${task.createdAt}, 1, 10)`, since), lte(sql`substr(${task.createdAt}, 1, 10)`, day))
    filter.push(eq(task.status, 'open'), or(inArray(task.id, active), newlyCreated)!)
  }

  return db.select(taskWithSums)
    .from(task)
    .leftJoin(block, eq(block.taskId, task.id))
    .where(and(...filter))
    .groupBy(task.id)
    .orderBy(asc(task.status), asc(task.title))
})
