import type { H3Event } from 'h3'
import { z } from 'zod'
import { datumSchema } from '#shared/utils/einstellungen'
import { tageZwischen } from '#shared/utils/zeit'

const idSchema = z.object({ id: z.coerce.number().int().positive() })

export async function idAusRoute(event: H3Event): Promise<number> {
  const { id } = await getValidatedRouterParams(event, idSchema.parse)
  return id
}

/** Zeitraum-Query `?von&bis` (inklusive), begrenzt auf ~1 Jahr. */
export const zeitraumQuerySchema = z.object({ von: datumSchema, bis: datumSchema })
  .refine(q => q.von <= q.bis, 'von muss vor bis liegen')
  .refine(q => tageZwischen(q.von, q.bis) <= 366, 'Zeitraum zu groß')

export function nichtGefunden(was: string): never {
  throw createError({ statusCode: 404, statusMessage: `${was} nicht gefunden` })
}

/** SQLite UNIQUE-Verletzung → 409 mit sprechender Meldung. */
export function istUniqueFehler(error: unknown): boolean {
  const text = String((error as { cause?: unknown })?.cause ?? error)
  return text.includes('UNIQUE constraint failed')
}
