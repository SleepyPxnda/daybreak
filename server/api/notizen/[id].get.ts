import { eq } from 'drizzle-orm'
import { notiz } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [n] = await db.select().from(notiz).where(eq(notiz.id, id))
  return n ?? nichtGefunden('Notiz')
})
