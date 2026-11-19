import { getTableColumns, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, block } from '../db/schema'

/** Fields without defaults - basis for PATCH. */
export const taskFields = z.object({
  accountId: z.number().int().positive(),
  key: z.string().trim().max(50).transform(k => k || null).nullable(),
  title: z.string().trim().min(1).max(200),
  status: z.enum(['open', 'closed']),
  estimateMin: z.number().int().positive().max(100_000).nullable(),
})

export const taskCreateSchema = taskFields.extend({
  key: taskFields.shape.key.optional(),
  status: taskFields.shape.status.default('open'),
  estimateMin: taskFields.shape.estimateMin.optional(),
})

/** Task columns + sums booked/planned (work blocks only) - for queries with LEFT JOIN on block. */
export const taskWithSums = {
  ...getTableColumns(task),
  bookedMin: sql<number>`coalesce(sum(case when ${block.kind} = 'work' and ${block.status} = 'booked' then ${block.end} - ${block.start} end), 0)`,
  plannedMin: sql<number>`coalesce(sum(case when ${block.kind} = 'work' and ${block.status} = 'planned' then ${block.end} - ${block.start} end), 0)`,
}
