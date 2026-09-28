import { eq } from 'drizzle-orm'
import { aufgabe, block, konto, vorlage } from '../../db/schema'
import { db } from '../../db/client'

// Plan §4: Konto mit Blöcken (oder Aufgaben) nicht löschbar, nur archivieren.
export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [hatAufgabe] = await db.select({ id: aufgabe.id }).from(aufgabe).where(eq(aufgabe.kontoId, id)).limit(1)
  const [hatBlock] = await db.select({ id: block.id }).from(block).where(eq(block.kontoId, id)).limit(1)
  const [hatVorlage] = await db.select({ id: vorlage.id }).from(vorlage).where(eq(vorlage.kontoId, id)).limit(1)
  if (hatAufgabe || hatBlock || hatVorlage) {
    throw createError({ statusCode: 409, statusMessage: 'Konto wird verwendet – bitte archivieren statt löschen' })
  }
  const [geloescht] = await db.delete(konto).where(eq(konto.id, id)).returning()
  return geloescht ?? nichtGefunden('Konto')
})
