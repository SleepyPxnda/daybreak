import { eq } from 'drizzle-orm'
import { note } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [deleted] = await db.delete(note).where(eq(note.id, id)).returning()
  return deleted ?? notFound('Notiz')
})
