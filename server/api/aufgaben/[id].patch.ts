import { eq } from 'drizzle-orm'
import { aufgabe, block, konto, vorlage } from '../../db/schema'
import { db } from '../../db/client'

const schema = aufgabeFelder.partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)

  const [alt] = await db.select().from(aufgabe).where(eq(aufgabe.id, id))
  if (!alt) nichtGefunden('Aufgabe')

  if (daten.kontoId !== undefined) {
    const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.id, daten.kontoId))
    if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  }

  const abgeschlossenAm = daten.status === undefined || daten.status === alt.status
    ? undefined
    : daten.status === 'abgeschlossen' ? new Date().toISOString() : null

  try {
    return await db.transaction(async (tx) => {
      const [neu] = await tx.update(aufgabe).set({ ...daten, abgeschlossenAm }).where(eq(aufgabe.id, id)).returning()
      // Plan §3.2: beim Verschieben in ein anderes Konto werden Blöcke (und Vorlagen) mitgezogen
      if (daten.kontoId !== undefined && daten.kontoId !== alt.kontoId) {
        await tx.update(block).set({ kontoId: daten.kontoId }).where(eq(block.aufgabeId, id))
        await tx.update(vorlage).set({ kontoId: daten.kontoId }).where(eq(vorlage.aufgabeId, id))
      }
      return neu!
    })
  }
  catch (error) {
    if (istUniqueFehler(error)) throw createError({ statusCode: 409, statusMessage: `Key „${daten.key}“ ist schon vergeben` })
    throw error
  }
})
