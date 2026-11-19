import { eq } from 'drizzle-orm'
import { task, block, account, template } from '../../db/schema'
import { db } from '../../db/client'

const schema = taskFields.partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)

  const [previous] = await db.select().from(task).where(eq(task.id, id))
  if (!previous) notFound('Aufgabe')

  if (data.accountId !== undefined) {
    const [k] = await db.select({ id: account.id }).from(account).where(eq(account.id, data.accountId))
    if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  }

  const closedAt = data.status === undefined || data.status === previous.status
    ? undefined
    : data.status === 'closed' ? new Date().toISOString() : null

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.update(task).set({ ...data, closedAt }).where(eq(task.id, id)).returning()
      // When moving to another account, blocks (and templates) move along
      if (data.accountId !== undefined && data.accountId !== previous.accountId) {
        await tx.update(block).set({ accountId: data.accountId }).where(eq(block.taskId, id))
        await tx.update(template).set({ accountId: data.accountId }).where(eq(template.taskId, id))
      }
      return created!
    })
  }
  catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: `Key „${data.key}“ ist schon vergeben` })
    throw error
  }
})
