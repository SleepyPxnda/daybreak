import { z } from 'zod'

const querySchema = z.object({ year: z.coerce.number().int().min(2000).max(2100) })

// Vacation balance card + previous-year carryover for "adopt carryover from previous year"
export default defineEventHandler(async (event) => {
  const { year } = await getValidatedQuery(event, querySchema.parse)
  await ensureVacationPrefill()
  const [current, previousYear] = await Promise.all([loadVacationBalance(year), loadVacationBalance(year - 1)])
  return {
    ...current.account,
    entitlements: current.entitlements,
    /** Carryover of the previous year, if entries exist there */
    previousYearCarryover: previousYear.entitlements.length ? previousYear.account.carryover : null,
  }
})
