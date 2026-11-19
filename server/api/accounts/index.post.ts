import { account } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, accountCreateSchema.parse)
  await checkAliases(data.aliases)
  const [created] = await db.insert(account).values(data).returning()
  return created!
})
