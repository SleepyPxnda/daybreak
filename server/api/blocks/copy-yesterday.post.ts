import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { findOverlap } from '#shared/utils/blocks'
import { dateSchema } from '#shared/utils/settings'
import { addDays } from '#shared/utils/time'

const schema = z.object({ date: dateSchema })

/**
 * "Like yesterday": copy booked blocks of the last day with bookings (up to 7 days back,
 * so it also works on Mondays) as *planned*. Occupied ranges are skipped.
 */
export default defineEventHandler(async (event) => {
  const { date } = await readValidatedBody(event, schema.parse)

  const [last] = await db.select({ date: block.date }).from(block)
    .where(and(eq(block.status, 'booked'), lt(block.date, date), gte(block.date, addDays(date, -7))))
    .orderBy(desc(block.date))
    .limit(1)
  if (!last) return { source: null, created: [], skipped: 0 }

  const source = await db.select().from(block)
    .where(and(eq(block.date, last.date), eq(block.status, 'booked')))
    .orderBy(asc(block.start))
  const occupied = await db.select({ start: block.start, end: block.end }).from(block).where(eq(block.date, date))

  const copies = []
  for (const b of source) {
    if (findOverlap(occupied, b)) continue
    copies.push({ date, start: b.start, end: b.end, kind: b.kind, status: 'planned' as const, taskId: b.taskId, accountId: b.accountId, note: b.note })
    occupied.push(b)
  }
  const created = copies.length ? await db.insert(block).values(copies).returning() : []
  return { source: last.date, created, skipped: source.length - created.length }
})
