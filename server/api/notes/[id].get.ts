import { eq } from 'drizzle-orm'
import { note } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idFromRoute(event)
  const [n] = await db.select().from(note).where(eq(note.id, id))
  return n ?? notFound('Notiz')
})
