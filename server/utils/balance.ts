import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { block } from '../db/schema'
import { db } from '../db/client'
import type { Settings } from '#shared/utils/settings'
import type { BalanceInput } from '#shared/utils/balance'
import type { IsoDate } from '#shared/utils/time'
import { addDays } from '#shared/utils/time'

/** Input for the balance and `balanceHistory`: actual per day and daily deviations from the start date until yesterday. */
export async function loadBalanceInput(today: IsoDate, settings: Settings): Promise<BalanceInput> {
  const start = settings.balanceStart
  const yesterday = addDays(today, -1)
  if (start.date > yesterday) return { start, today, actualPerDay: {}, days: {}, settings }

  const actualRows = await db.select({ date: block.date, minutes: sql<number>`sum(${block.end} - ${block.start})` })
    .from(block)
    .where(and(eq(block.kind, 'work'), eq(block.status, 'booked'), gte(block.date, start.date), lte(block.date, yesterday)))
    .groupBy(block.date)

  return {
    start,
    today,
    actualPerDay: Object.fromEntries(actualRows.map(z => [z.date, Number(z.minutes)])),
    days: await loadDayEntries(start.date, yesterday),
    settings,
  }
}
