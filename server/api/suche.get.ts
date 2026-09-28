import type { SQLWrapper } from 'drizzle-orm'
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, konto, todo } from '../db/schema'
import { db } from '../db/client'

const querySchema = z.object({ q: z.string().trim().min(1).max(100) })

// Plan §3.8 „ohne Präfix / kein Treffer → Suche über Aufgaben, Konten, Notizen, Todos“ (Notizen ab Phase 3)
export default defineEventHandler(async (event) => {
  const { q } = await getValidatedQuery(event, querySchema.parse)
  // LIKE-Platzhalter im Suchtext maskieren; SQLite-LIKE ist für ASCII case-insensitive
  const muster = `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`
  const enthaelt = (spalte: SQLWrapper) => sql`${spalte} like ${muster} escape '\\'`

  const [aufgaben, konten, todos] = await Promise.all([
    db.select({ id: aufgabe.id, key: aufgabe.key, titel: aufgabe.titel, status: aufgabe.status, kontoFarbe: konto.farbe })
      .from(aufgabe)
      .innerJoin(konto, eq(konto.id, aufgabe.kontoId))
      .where(or(enthaelt(aufgabe.titel), enthaelt(aufgabe.key)))
      .orderBy(desc(sql`${aufgabe.status} = 'offen'`), desc(aufgabe.id))
      .limit(8),
    db.select({ id: konto.id, name: konto.name, farbe: konto.farbe, status: konto.status })
      .from(konto)
      .where(or(enthaelt(konto.name), enthaelt(konto.aliase)))
      .limit(5),
    db.select({ id: todo.id, art: todo.art, text: todo.text, wer: todo.wer })
      .from(todo)
      .where(and(isNull(todo.erledigtAm), or(enthaelt(todo.text), enthaelt(todo.wer))))
      .limit(8),
  ])

  return { aufgaben, konten, todos }
})
