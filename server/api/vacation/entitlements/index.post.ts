import { vacationEntitlement } from '../../../db/schema'
import { db } from '../../../db/client'

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, entitlementFields.parse)
  const [created] = await db.insert(vacationEntitlement).values(data).returning()
  return created!
})
