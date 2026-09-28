import { eq } from 'drizzle-orm'
import { aufgabe, konto } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const daten = await readValidatedBody(event, aufgabeAnlegenSchema.parse)
  const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.id, daten.kontoId))
  if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  try {
    const [neu] = await db.insert(aufgabe).values({
      ...daten,
      abgeschlossenAm: daten.status === 'abgeschlossen' ? new Date().toISOString() : null,
    }).returning()
    return { ...neu!, gebuchtMin: 0, geplantMin: 0 }
  }
  catch (error) {
    if (istUniqueFehler(error)) throw createError({ statusCode: 409, statusMessage: `Key „${daten.key}“ ist schon vergeben` })
    throw error
  }
})
