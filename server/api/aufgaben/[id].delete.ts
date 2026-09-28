import { eq } from 'drizzle-orm'
import { aufgabe, block, vorlage } from '../../db/schema'
import { db } from '../../db/client'

// Plan §4: Aufgabe mit Blöcken nicht löschbar, nur abschließen.
export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [hatBlock] = await db.select({ id: block.id }).from(block).where(eq(block.aufgabeId, id)).limit(1)
  const [hatVorlage] = await db.select({ id: vorlage.id }).from(vorlage).where(eq(vorlage.aufgabeId, id)).limit(1)
  if (hatBlock || hatVorlage) {
    throw createError({ statusCode: 409, statusMessage: 'Aufgabe hat Blöcke – bitte abschließen statt löschen' })
  }
  const [geloescht] = await db.delete(aufgabe).where(eq(aufgabe.id, id)).returning()
  return geloescht ?? nichtGefunden('Aufgabe')
})
