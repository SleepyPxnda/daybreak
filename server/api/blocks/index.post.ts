import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { naechsterFreierSlot } from '#shared/utils/bloecke'
import { datumSchema, uhrzeitSchema } from '#shared/utils/einstellungen'
import { RASTER_MIN, TAG_MIN } from '#shared/utils/zeit'

const schema = z.object({
  datum: datumSchema,
  kind: z.enum(['arbeit', 'pause']),
  status: z.enum(['geplant', 'gebucht']),
  // Entweder feste Zeit …
  start: uhrzeitSchema.optional(),
  ende: uhrzeitSchema.optional(),
  // … oder Dauer → nächster freier Slot (Plan §3.8)
  dauer: z.number().int().positive().max(TAG_MIN).multipleOf(RASTER_MIN).optional(),
  aufgabeId: z.number().int().positive().nullish(),
  kontoId: z.number().int().positive().nullish(),
  notiz: z.string().trim().max(2000).nullish(),
}).refine(b => (b.start !== undefined && b.ende !== undefined) !== (b.dauer !== undefined), 'Entweder start+ende oder dauer angeben')

export default defineEventHandler(async (event) => {
  const daten = await readValidatedBody(event, schema.parse)
  const ziel = await loeseZielAuf(daten)

  let { start, ende } = daten
  if (daten.dauer !== undefined) {
    const { arbeitsbeginn } = await ladeEinstellungen()
    const tagesBloecke = await db.select({ start: block.start, ende: block.ende }).from(block).where(eq(block.datum, daten.datum))
    start = naechsterFreierSlot(tagesBloecke, arbeitsbeginn)
    ende = start + daten.dauer
    if (ende > TAG_MIN) throw createError({ statusCode: 409, statusMessage: 'Kein Platz mehr an diesem Tag' })
  }

  await pruefeZeitraum(daten.datum, { start: start!, ende: ende! })
  const [neu] = await db.insert(block).values({
    datum: daten.datum,
    kind: daten.kind,
    status: daten.status,
    start: start!,
    ende: ende!,
    ...ziel,
    notiz: daten.notiz || null,
  }).returning()
  return neu!
})
