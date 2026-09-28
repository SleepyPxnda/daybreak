import { notiz } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const daten = await readValidatedBody(event, notizAnlegenSchema.parse)
  const ziel = daten.aufgabeId != null || daten.kontoId != null
    ? await loeseZielAuf({ kind: 'arbeit', aufgabeId: daten.aufgabeId, kontoId: daten.aufgabeId ? null : daten.kontoId })
    : {}
  const [neu] = await db.insert(notiz).values({ ...daten, ...ziel }).returning()
  return neu!
})
