import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import { z } from 'zod'
import { confirmedOnTypeChange, day } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema } from '#shared/utils/settings'
import { dayInfo } from '#shared/utils/target'
import { dateRange, daysBetween } from '#shared/utils/time'

const range = { from: dateSchema, to: dateSchema }
const schema = z.union([
  z.object({ ...range, type: z.enum(['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag']) }),
  z.object({ ...range, blocker: z.boolean() }),
]).refine(b => b.from <= b.to && daysBetween(b.from, b.to) <= 366, 'Ungültiger Zeitraum')

/**
 * Calendar: set day type or blocker for a range.
 * Absences and blockers are stored only on regular workdays (weekends/holidays do not count anyway).
 * "Work" resets (including the blocker) - entries without target override/note are deleted, override/note are kept.
 * Blockers do not change the day type; "remove blocker" afterwards cleans up empty entries.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const { from, to } = body
  const settings = await loadSettings()
  const present = await loadDayEntries(from, to)
  const workdays = dateRange(from, to).filter(d => dayInfo(d, undefined, settings).isWorkday)
  const inRange = and(gte(day.date, from), lte(day.date, to))
  // Entries without any deviation (only deviations are stored)
  const empty = and(inRange, eq(day.type, 'arbeit'), isNull(day.targetOverride), isNull(day.note), eq(day.blocker, false))

  await db.transaction(async (tx) => {
    if ('blocker' in body) {
      if (body.blocker) {
        for (const date of workdays) {
          await tx.insert(day).values({ date, type: 'arbeit', blocker: true }).onConflictDoUpdate({ target: day.date, set: { blocker: true } })
        }
      }
      else {
        await tx.update(day).set({ blocker: false }).where(inRange)
        await tx.delete(day).where(empty)
      }
      return
    }

    const { type } = body
    if (type === 'arbeit') {
      const remove = Object.values(present).filter(e => e.targetOverride == null && !e.note).map(e => e.date)
      if (remove.length) await tx.delete(day).where(inArray(day.date, remove))
      const keep = Object.values(present).filter(e => !remove.includes(e.date)).map(e => e.date)
      if (keep.length) await tx.update(day).set({ type: 'arbeit', blocker: false }).where(inArray(day.date, keep))
      return
    }
    for (const date of workdays) {
      await tx.insert(day).values({ date, type }).onConflictDoUpdate({ target: day.date, set: { type, confirmed: confirmedOnTypeChange } })
    }
  })

  return { ok: true }
})
