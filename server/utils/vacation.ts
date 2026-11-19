import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { settings, vacationEntitlement } from '../db/schema'
import { db } from '../db/client'
import { vacationBalance, vacationPrefill } from '#shared/utils/vacation'
import { today } from '#shared/utils/time'
import { loadDayEntries } from './days'

/** Days in steps of 0.5 */
const daysSchema = z.number().min(-366).max(366).refine(t => Number.isInteger(t * 2), 'Nur halbe oder ganze Tage')

export const entitlementFields = z.object({
  year: z.number().int().min(2000).max(2100),
  kind: z.enum(['base', 'extra', 'carryover']),
  label: z.string().trim().min(1).max(100),
  days: daysSchema,
})

/** Seed once on first start for the current year (flag in settings). */
export async function ensureVacationPrefill() {
  const [flag] = await db.select().from(settings).where(eq(settings.key, 'urlaubVorbelegt'))
  if (flag) return
  const year = Number(today().slice(0, 4))
  await db.transaction(async (tx) => {
    const [present] = await tx.select({ id: vacationEntitlement.id }).from(vacationEntitlement).limit(1)
    if (!present) await tx.insert(vacationEntitlement).values(vacationPrefill(year).map(p => ({ ...p, year })))
    await tx.insert(settings).values({ key: 'urlaubVorbelegt', value: true }).onConflictDoNothing()
  })
}

export async function loadVacationEntitlements(year: number) {
  return db.select().from(vacationEntitlement).where(eq(vacationEntitlement.year, year)).orderBy(asc(vacationEntitlement.id))
}

/** Vacation balance of one year (entitlement, taken, planned, remaining). */
export async function loadVacationBalance(year: number) {
  const [entitlements, days, settings] = await Promise.all([
    loadVacationEntitlements(year),
    loadDayEntries(`${year}-01-01`, `${year}-12-31`),
    loadSettings(),
  ])
  return { entitlements, account: vacationBalance(year, entitlements, days, today(), settings) }
}
