import type { SQL } from 'drizzle-orm'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, konto, notiz } from '../../db/schema'
import { db } from '../../db/client'
import { notizAusschnitt } from '#shared/utils/notizen'

const querySchema = z.object({
  /** Suche über Titel + Inhalt (Plan §3.7: LIKE reicht für v1) */
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  aufgabeId: z.coerce.number().int().positive().optional(),
  kontoId: z.coerce.number().int().positive().optional(),
  angepinnt: z.enum(['1']).optional(),
})

// Liste ohne vollständigen Inhalt – nur Ausschnitt; angepinnte zuerst, dann zuletzt geändert
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = []
  if (query.q) filter.push(or(enthaelt(notiz.titel, query.q), enthaelt(notiz.inhalt, query.q))!)
  if (query.tag) filter.push(sql`exists (select 1 from json_each(${notiz.tags}) where value = ${query.tag})`)
  if (query.aufgabeId) filter.push(eq(notiz.aufgabeId, query.aufgabeId))
  if (query.kontoId) filter.push(eq(notiz.kontoId, query.kontoId))
  if (query.angepinnt) filter.push(eq(notiz.angepinnt, true))

  const zeilen = await db.select({
    id: notiz.id,
    titel: notiz.titel,
    inhalt: notiz.inhalt,
    tags: notiz.tags,
    angepinnt: notiz.angepinnt,
    aufgabeId: notiz.aufgabeId,
    kontoId: notiz.kontoId,
    geaendertAm: notiz.geaendertAm,
    aufgabeTitel: aufgabe.titel,
    kontoName: konto.name,
    kontoFarbe: konto.farbe,
  })
    .from(notiz)
    .leftJoin(aufgabe, eq(aufgabe.id, notiz.aufgabeId))
    .leftJoin(konto, eq(konto.id, notiz.kontoId))
    .where(and(...filter))
    .orderBy(desc(notiz.angepinnt), desc(notiz.geaendertAm))
    .limit(300)

  return zeilen.map(({ inhalt, ...rest }) => ({ ...rest, ausschnitt: notizAusschnitt(inhalt) }))
})
