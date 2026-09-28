import { eq } from 'drizzle-orm'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [geloescht] = await db.delete(todo).where(eq(todo.id, id)).returning()
  return geloescht ?? nichtGefunden('Eintrag')
})
