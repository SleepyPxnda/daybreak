import { z } from 'zod'
import { passesToNextYear } from '#shared/utils/vacation'

const querySchema = z.object({ year: z.coerce.number().int().min(2000).max(2100) })

// Vacation balance card + previous-year carryover for "adopt carryover from previous year"
export default defineEventHandler(async (event) => {
  const { year } = await getValidatedQuery(event, querySchema.parse)
  await ensureVacationPrefill()
  const [current, previousYear] = await Promise.all([loadVacationBalance(year), loadVacationBalance(year - 1)])
  const { entitlementUsage, passedToNextYear, ...account } = current.account
  return {
    ...account,
    entitlements: current.entitlements.map((entitlement, index) => ({
      ...entitlement,
      ...entitlementUsage[index]!,
      passesToNextYear: passesToNextYear(year, entitlement, entitlementUsage[index]!.remaining),
    })),
    /** Carryover of the previous year without limited remainders, if entries exist there */
    previousYearCarryover: previousYear.entitlements.length ? previousYear.account.carryoverToNextYear : null,
  }
})
