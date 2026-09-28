import { eq } from 'drizzle-orm'
import { notiz } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [geloescht] = await db.delete(notiz).where(eq(notiz.id, id)).returning()
  return geloescht ?? nichtGefunden('Notiz')
})
