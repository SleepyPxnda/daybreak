import type { H3Event } from 'h3'
import { z } from 'zod'
import { dateSchema } from '#shared/utils/settings'
import { daysBetween } from '#shared/utils/time'

const idSchema = z.object({ id: z.coerce.number().int().positive() })

export async function idFromRoute(event: H3Event): Promise<number> {
  const { id } = await getValidatedRouterParams(event, idSchema.parse)
  return id
}

/** Range query `?from&to` (inclusive), limited to about 1 year. */
export const rangeQuerySchema = z.object({ from: dateSchema, to: dateSchema })
  .refine(q => q.from <= q.to, 'von muss vor bis liegen')
  .refine(q => daysBetween(q.from, q.to) <= 366, 'Zeitraum zu groß')

export function notFound(was: string): never {
  throw createError({ statusCode: 404, statusMessage: `${was} nicht gefunden` })
}

/** SQLite UNIQUE violation -> 409 with a descriptive message. */
export function isUniqueViolation(error: unknown): boolean {
  const text = String((error as { cause?: unknown })?.cause ?? error)
  return text.includes('UNIQUE constraint failed')
}
