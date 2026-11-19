import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block, templateException } from '../../db/schema'
import { db } from '../../db/client'
import { dateSchema, timeSchema } from '#shared/utils/settings'

const schema = z.object({
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
  kind: z.enum(['arbeit', 'pause']),
  status: z.enum(['geplant', 'gebucht']),
  taskId: z.number().int().positive().nullable(),
  accountId: z.number().int().positive().nullable(),
  note: z.string().trim().max(2000).nullable(),
}).partial()

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const data = await readValidatedBody(event, schema.parse)
  const [previous] = await db.select().from(block).where(eq(block.id, id))
  if (!previous) notFound('Block')

  const merged = { ...previous, ...data }
  const assignmentChanged = data.kind !== undefined || data.taskId !== undefined || data.accountId !== undefined
  // New task without explicit account: the account comes from the task
  const assignment = assignmentChanged
    ? await resolveAssignment({ kind: merged.kind, taskId: merged.taskId, accountId: data.taskId ? null : merged.accountId })
    : {}

  await assertValidRange(merged.date, merged, id)

  // Template occurrence moved to another day: remember the original day as skipped
  const moved = data.date !== undefined && data.date !== previous.date && previous.templateId != null

  return db.transaction(async (tx) => {
    if (moved) {
      await tx.insert(templateException).values({ templateId: previous.templateId!, date: previous.date }).onConflictDoNothing()
    }
    const [changed] = await tx.update(block).set({
      ...data,
      ...assignment,
      note: data.note === undefined ? undefined : data.note || null,
      templateId: moved ? null : undefined,
    }).where(eq(block.id, id)).returning()
    return changed!
  })
})
