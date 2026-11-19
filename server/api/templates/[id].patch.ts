import { and, eq, gt } from 'drizzle-orm'
import { block, template } from '../../db/schema'
import { db } from '../../db/client'
import { isValidRange } from '#shared/utils/blocks'
import { today } from '#shared/utils/time'

const schema = templateFields.partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(template).where(eq(template.id, id))
  if (!previous) notFound('Vorlage')

  const merged = { ...previous, ...data }
  if (!isValidRange(merged)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum' })
  if (merged.validUntil && merged.validUntil < merged.validFrom) throw createError({ statusCode: 400, statusMessage: '„gültig bis“ liegt vor „gültig ab“' })
  const assignmentChanged = data.taskId !== undefined || data.accountId !== undefined
  const assignment = assignmentChanged
    ? await resolveAssignment({ kind: 'work', taskId: merged.taskId, accountId: data.taskId ? null : merged.accountId })
    : {}

  return db.transaction(async (tx) => {
    const [changed] = await tx.update(template).set({ ...data, ...assignment }).where(eq(template.id, id)).returning()
    // A change only affects future, still planned blocks - they are regenerated on next load.
    await tx.delete(block).where(and(eq(block.templateId, id), eq(block.status, 'planned'), gt(block.date, today())))
    return changed!
  })
})
