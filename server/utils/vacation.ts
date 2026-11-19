import { asc, eq, lte, min } from 'drizzle-orm'
import { z } from 'zod'
import { settings, vacationEntitlement } from '../db/schema'
import { db } from '../db/client'
import type { HandedOnEntitlement } from '#shared/utils/vacation'
import { effectiveVacationWindow, vacationBalance, vacationPrefill } from '#shared/utils/vacation'
import { dateSchema } from '#shared/utils/settings'
import { today } from '#shared/utils/time'
import { loadDayEntries } from './days'

/** Days in steps of 0.5 */
const daysSchema = z.number().min(-366).max(366).refine(t => Number.isInteger(t * 2), 'Nur halbe oder ganze Tage')

export const entitlementFields = z.object({
  year: z.number().int().min(2000).max(2100),
  kind: z.enum(['base', 'extra', 'carryover']),
  label: z.string().trim().min(1).max(100),
  days: daysSchema,
  validFrom: dateSchema.nullable().optional(),
  validUntil: dateSchema.nullable().optional(),
})

/** The three window rules; `row` is the stored row merged with the change. */
export function assertEntitlementWindow(row: { year: number, days: number, validFrom?: string | null, validUntil?: string | null }) {
  if (row.validFrom == null && row.validUntil == null) return
  const { from, until } = effectiveVacationWindow(row.year, row.validFrom, row.validUntil)
  const earliest = `${row.year}-01-01`
  const latest = `${row.year + 1}-12-31`
  if (from < earliest || from > latest || until < earliest || until > latest) {
    throw createError({ statusCode: 400, statusMessage: `Die Gültigkeit muss zwischen 01.01.${row.year} und 31.12.${row.year + 1} liegen.` })
  }
  if (from > until) throw createError({ statusCode: 400, statusMessage: '„Gültig ab“ darf nicht nach „Gültig bis“ liegen.' })
  if (row.days <= 0) throw createError({ statusCode: 400, statusMessage: 'Befristete Posten brauchen positive Tage.' })
}

/** Seed once on first start for the current year (flag in settings). */
export async function ensureVacationPrefill() {
  const [flag] = await db.select().from(settings).where(eq(settings.key, 'vacationPrefilled'))
  if (flag) return
  const year = Number(today().slice(0, 4))
  await db.transaction(async (tx) => {
    const [present] = await tx.select({ id: vacationEntitlement.id }).from(vacationEntitlement).limit(1)
    if (!present) await tx.insert(vacationEntitlement).values(vacationPrefill(year).map(p => ({ ...p, year })))
    await tx.insert(settings).values({ key: 'vacationPrefilled', value: true }).onConflictDoNothing()
  })
}

export async function loadVacationEntitlements(year: number) {
  return db.select().from(vacationEntitlement).where(eq(vacationEntitlement.year, year)).orderBy(asc(vacationEntitlement.id))
}

/**
 * Vacation balance of one year (entitlement, taken, planned, forfeited, remaining).
 * Folds over every year from the earliest entry year, because limited entries hand their remainder on to the next year.
 */
export async function loadVacationBalance(year: number) {
  const [earliest] = await db.select({ earliestYear: min(vacationEntitlement.year) }).from(vacationEntitlement).where(lte(vacationEntitlement.year, year))
  const firstYear = Math.min(earliest?.earliestYear ?? year, year)
  const [rows, days, settings] = await Promise.all([
    db.select().from(vacationEntitlement).where(lte(vacationEntitlement.year, year)).orderBy(asc(vacationEntitlement.id)),
    loadDayEntries(`${firstYear}-01-01`, `${year}-12-31`),
    loadSettings(),
  ])
  const todayDate = today()
  let handedOn: HandedOnEntitlement[] = []
  let result: { entitlements: typeof rows, account: ReturnType<typeof vacationBalance> } | undefined
  for (let currentYear = firstYear; currentYear <= year; currentYear++) {
    const entitlements = rows.filter(row => row.year === currentYear)
    const account = vacationBalance(currentYear, entitlements, days, todayDate, settings, handedOn)
    handedOn = account.passedToNextYear
    result = { entitlements, account }
  }
  return result!
}
