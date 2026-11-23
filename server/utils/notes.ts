import type { SQLWrapper } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { normalizeTags } from '#shared/utils/notes'

/** Fields without defaults - basis for PATCH. */
export const noteFields = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200_000),
  kind: z.enum(['meeting', 'problem', 'info']).nullable(),
  tags: z.array(z.string()).max(30).transform(normalizeTags),
  taskId: z.number().int().positive().nullable(),
  accountId: z.number().int().positive().nullable(),
  pinned: z.boolean(),
})

export const noteCreateSchema = noteFields.partial().required({ title: true })

/** LIKE condition "contains" with escaped placeholders (SQLite LIKE is case-insensitive for ASCII). */
export function contains(column: SQLWrapper, text: string) {
  const pattern = `%${text.replace(/[\\%_]/g, c => `\\${c}`)}%`
  return sql`${column} like ${pattern} escape '\\'`
}
