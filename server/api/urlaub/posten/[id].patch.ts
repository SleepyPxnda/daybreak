import { eq } from 'drizzle-orm'
import { urlaubsanspruch } from '../../../db/schema'
import { db } from '../../../db/client'

const schema = postenFelder.omit({ jahr: true }).partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)
  const [geaendert] = await db.update(urlaubsanspruch).set(daten).where(eq(urlaubsanspruch.id, id)).returning()
  return geaendert ?? nichtGefunden('Posten')
})
