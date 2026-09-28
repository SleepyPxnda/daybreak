import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, block, konto } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { plusTage } from '#shared/utils/zeit'

const querySchema = z.object({ datum: datumSchema })

// Tagesabschluss-Vorschläge (Plan §5): zuletzt bebuchte Aufgaben und Konten der letzten 14 Tage
export default defineEventHandler(async (event) => {
  const { datum } = await getValidatedQuery(event, querySchema.parse)
  const zeilen = await db.select({
    aufgabeId: block.aufgabeId,
    kontoId: block.kontoId,
    zuletzt: sql<string>`max(${block.datum})`,
    aufgabeKey: aufgabe.key,
    aufgabeTitel: aufgabe.titel,
    aufgabeStatus: aufgabe.status,
    kontoName: konto.name,
    kontoFarbe: konto.farbe,
    kontoStatus: konto.status,
  })
    .from(block)
    .leftJoin(aufgabe, eq(aufgabe.id, block.aufgabeId))
    .innerJoin(konto, eq(konto.id, block.kontoId))
    .where(and(eq(block.kind, 'arbeit'), eq(block.status, 'gebucht'), gte(block.datum, plusTage(datum, -14)), lte(block.datum, datum)))
    .groupBy(block.aufgabeId, block.kontoId)
    .orderBy(desc(sql`max(${block.datum})`), desc(sql`max(${block.id})`))

  return zeilen
    .filter(z => z.kontoStatus === 'aktiv' && (z.aufgabeId === null || z.aufgabeStatus === 'offen'))
    .slice(0, 8)
})
