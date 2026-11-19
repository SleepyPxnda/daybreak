import { eq } from 'drizzle-orm'
import { account } from '../../db/schema'
import { db } from '../../db/client'

const schema = accountFields.partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  if (data.aliases) await checkAliases(data.aliases, id)
  const [stored] = await db.select({ status: account.status }).from(account).where(eq(account.id, id))
  if (!stored) return notFound('Konto')
  // Only reactivating moves the account to the end; saving an active account unchanged keeps its position
  const reactivated = stored.status === 'archived' && data.status === 'active'
  const [changed] = await db.update(account)
    .set(reactivated ? { ...data, sortOrder: await nextAccountSortOrder() } : data)
    .where(eq(account.id, id))
    .returning()
  return changed ?? notFound('Konto')
})
