import { eq } from 'drizzle-orm'
import { notiz } from '../../db/schema'
import { db } from '../../db/client'

const schema = notizFelder.partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(notiz).where(eq(notiz.id, id))
  if (!alt) nichtGefunden('Notiz')

  const werte: Record<string, unknown> = { ...daten }
  if (daten.aufgabeId !== undefined || daten.kontoId !== undefined) {
    const aufgabeId = daten.aufgabeId !== undefined ? daten.aufgabeId : alt.aufgabeId
    const kontoId = daten.aufgabeId ? null : (daten.kontoId !== undefined ? daten.kontoId : alt.kontoId)
    Object.assign(werte, aufgabeId == null && kontoId == null
      ? { aufgabeId: null, kontoId: null }
      : await loeseZielAuf({ kind: 'arbeit', aufgabeId, kontoId }))
  }
  // Anpinnen allein zählt nicht als inhaltliche Änderung
  const inhaltlich = Object.keys(daten).some(k => k !== 'angepinnt')
  if (inhaltlich) werte.geaendertAm = new Date().toISOString()

  const [geaendert] = await db.update(notiz).set(werte).where(eq(notiz.id, id)).returning()
  return geaendert!
})
