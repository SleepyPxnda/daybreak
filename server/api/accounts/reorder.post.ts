import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { account } from '../../db/schema'
import { db } from '../../db/client'

// Drag and drop: new order of the active accounts as a sequence of IDs
const schema = z.object({ ids: z.array(z.number().int().positive()).max(500) })

export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, schema.parse)
  const activeIds = (await db.select({ id: account.id }).from(account).where(eq(account.status, 'active'))).map(row => row.id)
  const isExactlyActiveSet = ids.length === activeIds.length && new Set(ids).size === ids.length && ids.every(id => activeIds.includes(id))
  if (!isExactlyActiveSet) {
    throw createError({ statusCode: 400, statusMessage: 'Die Reihenfolge muss alle aktiven Konten genau einmal enthalten.' })
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(account).set({ sortOrder: index }).where(eq(account.id, id))
    }
  })
  return { ok: true }
})
