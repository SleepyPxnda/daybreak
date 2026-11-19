import { eq } from 'drizzle-orm'
import { block, template } from '../../db/schema'
import { db } from '../../db/client'
import { isValidRange } from '#shared/utils/blocks'

export default defineEventHandler(async (event) => {
  const { fromBlockId, ...data } = await readValidatedBody(event, templateCreateSchema.parse)
  if (!isValidRange(data)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum' })
  if (data.validUntil && data.validUntil < data.validFrom) throw createError({ statusCode: 400, statusMessage: '„gültig bis“ liegt vor „gültig ab“' })
  const assignment = await resolveAssignment({ kind: 'work', taskId: data.taskId, accountId: data.accountId })

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(template).values({ ...data, ...assignment }).returning()
    if (fromBlockId) {
      await tx.update(block).set({ templateId: created!.id }).where(eq(block.id, fromBlockId))
    }
    return created!
  })
})
