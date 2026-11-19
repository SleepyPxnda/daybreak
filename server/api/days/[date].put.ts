import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { confirmedOnTypeChange, day } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'
import { dayInfo } from '#shared/utils/target'
import { DAY_MIN } from '#shared/utils/time'

const paramsSchema = z.object({ date: dateSchema })
const schema = z.object({
  type: z.enum(['work', 'vacation', 'half_vacation', 'sick', 'flex_day']),
  targetOverride: z.number().int().min(0).max(DAY_MIN).nullable().default(null),
  note: z.string().trim().max(500).nullable().default(null),
})

// Only deviations are stored - a normal workday without override/note/blocker deletes the entry.
// The blocker is only set in the calendar and stays untouched here.
export default defineEventHandler(async (event) => {
  const { date } = await getValidatedRouterParams(event, paramsSchema.parse)
  const data = await readValidatedBody(event, schema.parse)
  const note = data.note || null
  const [before] = await db.select({ blocker: day.blocker }).from(day).where(eq(day.date, date))

  if (data.type === 'work' && data.targetOverride === null && !note && !before?.blocker) {
    await db.delete(day).where(eq(day.date, date))
  }
  else {
    const values = { type: data.type, targetOverride: data.targetOverride, note }
    await db.insert(day).values({ date, ...values }).onConflictDoUpdate({ target: day.date, set: { ...values, confirmed: confirmedOnTypeChange } })
  }

  const [entry] = await db.select().from(day).where(eq(day.date, date))
  return { ...dayInfo(date, entry, await loadSettings()), note: entry?.note ?? null, blocker: entry?.blocker ?? false }
})
