import type { SQL } from 'drizzle-orm'
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, konto, todo } from '../../db/schema'
import { db } from '../../db/client'

const querySchema = z.object({
  art: z.enum(['merker', 'daily', 'warten']).optional(),
  /** offen (Default) oder erledigt (Archiv) */
  status: z.enum(['offen', 'erledigt']).default('offen'),
  aufgabeId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = [query.status === 'offen' ? isNull(todo.erledigtAm) : isNotNull(todo.erledigtAm)]
  if (query.art) filter.push(eq(todo.art, query.art))
  if (query.aufgabeId) filter.push(eq(todo.aufgabeId, query.aufgabeId))

  return db.select(todoMitBezug)
    .from(todo)
    .leftJoin(aufgabe, eq(aufgabe.id, todo.aufgabeId))
    .leftJoin(konto, eq(konto.id, todo.kontoId))
    .where(and(...filter))
    .orderBy(...(query.status === 'offen' ? [asc(todo.sortierung), asc(todo.id)] : [desc(todo.erledigtAm)]))
    .limit(query.status === 'offen' ? 500 : 200)
})
