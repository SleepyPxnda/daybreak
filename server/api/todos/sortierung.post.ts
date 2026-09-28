import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

// Drag & Drop (Plan §3.6): neue Reihenfolge einer Liste als ID-Folge
const schema = z.object({ ids: z.array(z.number().int().positive()).max(500) })

export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, schema.parse)
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(todo).set({ sortierung: index }).where(eq(todo.id, id))
    }
  })
  return { ok: true }
})
