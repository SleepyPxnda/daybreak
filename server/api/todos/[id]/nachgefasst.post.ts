import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { todo } from '../../../db/schema'
import { db } from '../../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { NACHFASSEN_ARBEITSTAGE, plusArbeitstage } from '#shared/utils/todos'
import { heute } from '#shared/utils/zeit'

// Plan §3.6: „nachgefasst“ setzt ein neues Nachfass-Datum, Default +3 Arbeitstage
const schema = z.object({ bis: datumSchema.optional() })

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const { bis } = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(todo).where(eq(todo.id, id))
  if (!alt) nichtGefunden('Eintrag')
  if (alt.art !== 'warten') throw createError({ statusCode: 400, statusMessage: 'Nur bei „Warten auf“ möglich' })

  const nachfassenAm = bis ?? plusArbeitstage(heute(), NACHFASSEN_ARBEITSTAGE, await ladeEinstellungen())
  const [geaendert] = await db.update(todo).set({ nachfassenAm }).where(eq(todo.id, id)).returning()
  return geaendert!
})
