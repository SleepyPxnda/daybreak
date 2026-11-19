import { eq } from 'drizzle-orm'
import { vacationEntitlement } from '../../../db/schema'
import { db } from '../../../db/client'

const schema = entitlementFields.omit({ year: true }).partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  const [stored] = await db.select().from(vacationEntitlement).where(eq(vacationEntitlement.id, id))
  if (!stored) return notFound('Posten')
  assertEntitlementWindow({ ...stored, ...data })
  const [changed] = await db.update(vacationEntitlement).set(data).where(eq(vacationEntitlement.id, id)).returning()
  return changed ?? notFound('Posten')
})
