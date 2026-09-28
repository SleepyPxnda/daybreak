import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { aufgabe, block, konto } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const { von, bis } = await getValidatedQuery(event, zeitraumQuerySchema.parse)
  const einstellungen = await ladeEinstellungen()
  // Plan §3.2: beim Laden fehlende geplante Blöcke aus Vorlagen erzeugen
  const { konflikte } = await materialisiereVorlagen(von, bis, einstellungen)

  const bloecke = await db.select(blockMitAnzeige)
    .from(block)
    .leftJoin(aufgabe, eq(aufgabe.id, block.aufgabeId))
    .leftJoin(konto, eq(konto.id, block.kontoId))
    .where(and(gte(block.datum, von), lte(block.datum, bis)))
    .orderBy(asc(block.datum), asc(block.start))

  return { bloecke, konflikte }
})
