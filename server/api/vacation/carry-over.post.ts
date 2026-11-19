import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { vacationEntitlement } from '../../db/schema'
import { db } from '../../db/client'

const schema = z.object({ year: z.number().int().min(2000).max(2100) })

// Carryover of the previous year as its own entry - replaces an existing carryover entry
export default defineEventHandler(async (event) => {
  const { year } = await readValidatedBody(event, schema.parse)
  const previousYear = await loadVacationBalance(year - 1)
  if (!previousYear.entitlements.length) throw createError({ statusCode: 400, statusMessage: `Für ${year - 1} gibt es keinen Urlaubsanspruch` })

  const days = Math.round(previousYear.account.carryoverToNextYear * 2) / 2
  const [replaced] = await db.select().from(vacationEntitlement).where(and(eq(vacationEntitlement.year, year), eq(vacationEntitlement.kind, 'carryover'))).orderBy(asc(vacationEntitlement.id))
  const window = { validFrom: replaced?.validFrom ?? null, validUntil: replaced?.validUntil ?? null }
  assertEntitlementWindow({ year, days, ...window })
  return db.transaction(async (tx) => {
    await tx.delete(vacationEntitlement).where(and(eq(vacationEntitlement.year, year), eq(vacationEntitlement.kind, 'carryover')))
    const [created] = await tx.insert(vacationEntitlement).values({ year, kind: 'carryover', label: `Resturlaub ${year - 1}`, days, ...window }).returning()
    return created!
  })
})
