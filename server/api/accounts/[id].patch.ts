import { eq } from 'drizzle-orm'
import { account } from '../../db/schema'
import { db } from '../../db/client'

const schema = accountFields.partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  if (data.aliases) await checkAliases(data.aliases, id)
  const [changed] = await db.update(account).set(data).where(eq(account.id, id)).returning()
  return changed ?? notFound('Konto')
})
