import { eq } from 'drizzle-orm'
import { block, vorlage } from '../../db/schema'
import { db } from '../../db/client'
import { istGueltigerZeitraum } from '#shared/utils/bloecke'

export default defineEventHandler(async (event) => {
  const { ausBlockId, ...daten } = await readValidatedBody(event, vorlageAnlegenSchema.parse)
  if (!istGueltigerZeitraum(daten)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum' })
  if (daten.gueltigBis && daten.gueltigBis < daten.gueltigAb) throw createError({ statusCode: 400, statusMessage: '„gültig bis“ liegt vor „gültig ab“' })
  const ziel = await loeseZielAuf({ kind: 'arbeit', aufgabeId: daten.aufgabeId, kontoId: daten.kontoId })

  return db.transaction(async (tx) => {
    const [neu] = await tx.insert(vorlage).values({ ...daten, ...ziel }).returning()
    if (ausBlockId) {
      await tx.update(block).set({ vorlageId: neu!.id }).where(eq(block.id, ausBlockId))
    }
    return neu!
  })
})
