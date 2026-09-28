import { z } from 'zod'

const querySchema = z.object({ jahr: z.coerce.number().int().min(2000).max(2100) })

// Urlaubskonto-Karte (Plan §3.5) + Vorjahres-Rest für „Rest aus Vorjahr übernehmen“
export default defineEventHandler(async (event) => {
  const { jahr } = await getValidatedQuery(event, querySchema.parse)
  await stelleUrlaubVorbelegungSicher()
  const [aktuell, vorjahr] = await Promise.all([ladeUrlaubskonto(jahr), ladeUrlaubskonto(jahr - 1)])
  return {
    ...aktuell.konto,
    posten: aktuell.posten,
    /** Rest des Vorjahres, falls dort Posten existieren */
    vorjahrRest: vorjahr.posten.length ? vorjahr.konto.rest : null,
  }
})
