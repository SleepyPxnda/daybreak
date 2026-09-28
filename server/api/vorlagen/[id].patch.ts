import { and, eq, gt } from 'drizzle-orm'
import { block, vorlage } from '../../db/schema'
import { db } from '../../db/client'
import { istGueltigerZeitraum } from '#shared/utils/bloecke'
import { heute } from '#shared/utils/zeit'

const schema = vorlageFelder.partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(vorlage).where(eq(vorlage.id, id))
  if (!alt) nichtGefunden('Vorlage')

  const neu = { ...alt, ...daten }
  if (!istGueltigerZeitraum(neu)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum' })
  if (neu.gueltigBis && neu.gueltigBis < neu.gueltigAb) throw createError({ statusCode: 400, statusMessage: '„gültig bis“ liegt vor „gültig ab“' })
  const zielGeaendert = daten.aufgabeId !== undefined || daten.kontoId !== undefined
  const ziel = zielGeaendert
    ? await loeseZielAuf({ kind: 'arbeit', aufgabeId: neu.aufgabeId, kontoId: daten.aufgabeId ? null : neu.kontoId })
    : {}

  return db.transaction(async (tx) => {
    const [geaendert] = await tx.update(vorlage).set({ ...daten, ...ziel }).where(eq(vorlage.id, id)).returning()
    // Plan §3.2: Änderung wirkt nur auf zukünftige, noch geplante Blöcke – die werden beim nächsten Laden neu erzeugt.
    await tx.delete(block).where(and(eq(block.vorlageId, id), eq(block.status, 'geplant'), gt(block.datum, heute())))
    return geaendert!
  })
})
