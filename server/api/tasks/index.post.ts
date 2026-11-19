import { eq } from 'drizzle-orm'
import { task, account } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, taskCreateSchema.parse)
  const [k] = await db.select({ id: account.id }).from(account).where(eq(account.id, data.accountId))
  if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  try {
    const [created] = await db.insert(task).values({
      ...data,
      closedAt: data.status === 'abgeschlossen' ? new Date().toISOString() : null,
    }).returning()
    return { ...created!, bookedMin: 0, plannedMin: 0 }
  }
  catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: `Key „${data.key}“ ist schon vergeben` })
    throw error
  }
})
