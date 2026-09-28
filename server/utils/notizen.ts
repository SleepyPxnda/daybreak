import type { SQLWrapper } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { normalisiereTags } from '#shared/utils/notizen'

/** Felder ohne Defaults – Basis für PATCH. */
export const notizFelder = z.object({
  titel: z.string().trim().min(1).max(200),
  inhalt: z.string().max(200_000),
  tags: z.array(z.string()).max(30).transform(normalisiereTags),
  aufgabeId: z.number().int().positive().nullable(),
  kontoId: z.number().int().positive().nullable(),
  angepinnt: z.boolean(),
})

export const notizAnlegenSchema = notizFelder.partial().required({ titel: true })

/** LIKE-Bedingung „enthält“ mit maskierten Platzhaltern (SQLite-LIKE ist für ASCII case-insensitive). */
export function enthaelt(spalte: SQLWrapper, text: string) {
  const muster = `%${text.replace(/[\\%_]/g, c => `\\${c}`)}%`
  return sql`${spalte} like ${muster} escape '\\'`
}
