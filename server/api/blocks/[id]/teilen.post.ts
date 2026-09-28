import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../../db/schema'
import { db } from '../../../db/client'
import { teileZeitraum } from '#shared/utils/bloecke'
import { uhrzeitSchema } from '#shared/utils/einstellungen'

const schema = z.object({ bei: uhrzeitSchema })

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const { bei } = await readValidatedBody(event, schema.parse)
  const [alt] = await db.select().from(block).where(eq(block.id, id))
  if (!alt) nichtGefunden('Block')

  const teile = teileZeitraum(alt, bei)
  if (!teile) throw createError({ statusCode: 400, statusMessage: 'Teilungspunkt muss innerhalb des Blocks liegen' })
  const [erster, zweiter] = teile

  return db.transaction(async (tx) => {
    const [a] = await tx.update(block).set({ ende: erster.ende }).where(eq(block.id, id)).returning()
    const { id: _id, erstelltAm: _erstelltAm, ...kopie } = alt
    // Der zweite Teil ist ein normaler Block – nur der erste bleibt der Vorlagen-Termin
    const [b] = await tx.insert(block).values({ ...kopie, ...zweiter, vorlageId: null }).returning()
    return [a!, b!]
  })
})
