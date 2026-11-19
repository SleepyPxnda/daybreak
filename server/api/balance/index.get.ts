import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { plannedMinutes, actualMinutes } from '#shared/utils/blocks'
import { dateSchema } from '#shared/utils/settings'
import { currentBalance } from '#shared/utils/balance'
import { dayInfo } from '#shared/utils/target'
import { today as todayDate } from '#shared/utils/time'

const querySchema = z.object({ today: dateSchema.optional() })

// Balance widget: "Balance until yesterday: +3:15 | today: 5:30 / 8:00"
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const today = query.today ?? todayDate()
  const settings = await loadSettings()

  const balanceUntilYesterday = currentBalance(await loadBalanceInput(today, settings))

  const todayBlocks = await db.select().from(block).where(eq(block.date, today))
  const todayEntry = (await loadDayEntries(today, today))[today]

  return {
    balanceUntilYesterday,
    today: {
      ...dayInfo(today, todayEntry, settings),
      actual: actualMinutes(todayBlocks),
      planned: plannedMinutes(todayBlocks),
    },
  }
})
