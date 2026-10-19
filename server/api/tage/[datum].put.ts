import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { bestaetigtBeiTypwechsel, tag } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { tagesInfo } from '#shared/utils/soll'
import { TAG_MIN } from '#shared/utils/zeit'

const paramsSchema = z.object({ datum: datumSchema })
const schema = z.object({
  typ: z.enum(['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag']),
  sollOverride: z.number().int().min(0).max(TAG_MIN).nullable().default(null),
  notiz: z.string().trim().max(500).nullable().default(null),
})

// Nur Abweichungen werden gespeichert (Plan §4) – ein normaler Arbeitstag ohne Override/Notiz/Blocker löscht den Eintrag.
// Der Blocker wird nur im Kalender gesetzt und bleibt hier unangetastet.
export default defineEventHandler(async (event) => {
  const { datum } = await getValidatedRouterParams(event, paramsSchema.parse)
  const daten = await readValidatedBody(event, schema.parse)
  const notiz = daten.notiz || null
  const [vorher] = await db.select({ blocker: tag.blocker }).from(tag).where(eq(tag.datum, datum))

  if (daten.typ === 'arbeit' && daten.sollOverride === null && !notiz && !vorher?.blocker) {
    await db.delete(tag).where(eq(tag.datum, datum))
  }
  else {
    const werte = { typ: daten.typ, sollOverride: daten.sollOverride, notiz }
    await db.insert(tag).values({ datum, ...werte }).onConflictDoUpdate({ target: tag.datum, set: { ...werte, bestaetigt: bestaetigtBeiTypwechsel } })
  }

  const [eintrag] = await db.select().from(tag).where(eq(tag.datum, datum))
  return { ...tagesInfo(datum, eintrag, await ladeEinstellungen()), notiz: eintrag?.notiz ?? null, blocker: eintrag?.blocker ?? false }
})
