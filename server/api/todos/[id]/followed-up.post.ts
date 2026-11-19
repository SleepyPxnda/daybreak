import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { todo } from '../../../db/schema'
import { db } from '../../../db/client'
import { dateSchema } from '#shared/utils/settings'
import { FOLLOW_UP_WORKDAYS, addWorkdays } from '#shared/utils/todos'
import { today } from '#shared/utils/time'

// "Followed up" sets a new follow-up date, default +3 workdays
const schema = z.object({ to: dateSchema.optional() })

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const { to } = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(todo).where(eq(todo.id, id))
  if (!previous) notFound('Eintrag')
  if (previous.kind !== 'waiting_for') throw createError({ statusCode: 400, statusMessage: 'Nur bei „Warten auf“ möglich' })

  const followUpDate = to ?? addWorkdays(today(), FOLLOW_UP_WORKDAYS, await loadSettings())
  const [changed] = await db.update(todo).set({ followUpDate }).where(eq(todo.id, id)).returning()
  return changed!
})
