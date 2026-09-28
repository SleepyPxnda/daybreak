import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

const schema = todoFelder.partial().extend({
  /** erledigt / besprochen (true) bzw. wieder öffnen (false) */
  erledigt: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const { erledigt, ...daten } = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(todo).where(eq(todo.id, id))
  if (!alt) nichtGefunden('Eintrag')

  const art = daten.art ?? alt.art
  const werte: Record<string, unknown> = bereinigeTodo(art, daten)
  // Beim Wechsel der Art unpassende Felder leeren
  if (daten.art && daten.art !== alt.art) Object.assign(werte, bereinigeTodo(art, { wer: alt.wer, nachfassenAm: alt.nachfassenAm, faelligAm: alt.faelligAm }))

  if (daten.aufgabeId !== undefined || daten.kontoId !== undefined) {
    const aufgabeId = daten.aufgabeId !== undefined ? daten.aufgabeId : alt.aufgabeId
    const kontoId = daten.aufgabeId ? null : (daten.kontoId !== undefined ? daten.kontoId : alt.kontoId)
    Object.assign(werte, aufgabeId == null && kontoId == null
      ? { aufgabeId: null, kontoId: null }
      : await loeseZielAuf({ kind: 'arbeit', aufgabeId, kontoId }))
  }
  if (erledigt !== undefined) werte.erledigtAm = erledigt ? new Date().toISOString() : null

  const [geaendert] = await db.update(todo).set(werte).where(eq(todo.id, id)).returning()
  return geaendert!
})
