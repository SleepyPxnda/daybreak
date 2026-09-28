import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block, vorlageAusnahme } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema, uhrzeitSchema } from '#shared/utils/einstellungen'

const schema = z.object({
  datum: datumSchema,
  start: uhrzeitSchema,
  ende: uhrzeitSchema,
  kind: z.enum(['arbeit', 'pause']),
  status: z.enum(['geplant', 'gebucht']),
  aufgabeId: z.number().int().positive().nullable(),
  kontoId: z.number().int().positive().nullable(),
  notiz: z.string().trim().max(2000).nullable(),
}).partial()

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const daten = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(block).where(eq(block.id, id))
  if (!alt) nichtGefunden('Block')

  const neu = { ...alt, ...daten }
  const zielGeaendert = daten.kind !== undefined || daten.aufgabeId !== undefined || daten.kontoId !== undefined
  // Neue Aufgabe ohne explizites Konto → Konto kommt von der Aufgabe
  const ziel = zielGeaendert
    ? await loeseZielAuf({ kind: neu.kind, aufgabeId: neu.aufgabeId, kontoId: daten.aufgabeId ? null : neu.kontoId })
    : {}

  await pruefeZeitraum(neu.datum, neu, id)

  // Vorlagen-Termin auf einen anderen Tag verschoben → ursprünglichen Tag als ausgelassen merken
  const verschoben = daten.datum !== undefined && daten.datum !== alt.datum && alt.vorlageId != null

  return db.transaction(async (tx) => {
    if (verschoben) {
      await tx.insert(vorlageAusnahme).values({ vorlageId: alt.vorlageId!, datum: alt.datum }).onConflictDoNothing()
    }
    const [geaendert] = await tx.update(block).set({
      ...daten,
      ...ziel,
      notiz: daten.notiz === undefined ? undefined : daten.notiz || null,
      vorlageId: verschoben ? null : undefined,
    }).where(eq(block.id, id)).returning()
    return geaendert!
  })
})
