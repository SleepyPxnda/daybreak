import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { urlaubsanspruch } from '../../db/schema'
import { db } from '../../db/client'

const schema = z.object({ jahr: z.number().int().min(2000).max(2100) })

// Plan §3.5: Resturlaub des Vorjahres als eigener Posten – ersetzt einen vorhandenen Rest-Posten
export default defineEventHandler(async (event) => {
  const { jahr } = await readValidatedBody(event, schema.parse)
  const vorjahr = await ladeUrlaubskonto(jahr - 1)
  if (!vorjahr.posten.length) throw createError({ statusCode: 400, statusMessage: `Für ${jahr - 1} gibt es keinen Urlaubsanspruch` })

  const tage = Math.round(vorjahr.konto.rest * 2) / 2
  return db.transaction(async (tx) => {
    await tx.delete(urlaubsanspruch).where(and(eq(urlaubsanspruch.jahr, jahr), eq(urlaubsanspruch.art, 'rest')))
    const [neu] = await tx.insert(urlaubsanspruch).values({ jahr, art: 'rest', bezeichnung: `Resturlaub ${jahr - 1}`, tage }).returning()
    return neu!
  })
})
