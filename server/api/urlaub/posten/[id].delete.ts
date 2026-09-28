import { eq } from 'drizzle-orm'
import { urlaubsanspruch } from '../../../db/schema'
import { db } from '../../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [geloescht] = await db.delete(urlaubsanspruch).where(eq(urlaubsanspruch.id, id)).returning()
  return geloescht ?? nichtGefunden('Posten')
})
