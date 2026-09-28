import { eq } from 'drizzle-orm'
import { konto } from '../../db/schema'
import { db } from '../../db/client'

const schema = kontoFelder.partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)
  if (daten.aliase) await pruefeAliase(daten.aliase, id)
  const [geaendert] = await db.update(konto).set(daten).where(eq(konto.id, id)).returning()
  return geaendert ?? nichtGefunden('Konto')
})
