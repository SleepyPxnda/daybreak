import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { vacationEntitlement } from '../../db/schema'
import { db } from '../../db/client'

const schema = z.object({ year: z.number().int().min(2000).max(2100) })

// Carryover of the previous year as its own entry - replaces an existing carryover entry
export default defineEventHandler(async (event) => {
  const { year } = await readValidatedBody(event, schema.parse)
  const previousYear = await loadVacationBalance(year - 1)
  if (!previousYear.entitlements.length) throw createError({ statusCode: 400, statusMessage: `Für ${year - 1} gibt es keinen Urlaubsanspruch` })

  const days = Math.round(previousYear.account.carryover * 2) / 2
  return db.transaction(async (tx) => {
    await tx.delete(vacationEntitlement).where(and(eq(vacationEntitlement.year, year), eq(vacationEntitlement.kind, 'rest')))
    const [created] = await tx.insert(vacationEntitlement).values({ year, kind: 'rest', label: `Resturlaub ${year - 1}`, days }).returning()
    return created!
  })
})
