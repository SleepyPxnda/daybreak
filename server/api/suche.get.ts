import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, konto, notiz, todo } from '../db/schema'
import { db } from '../db/client'

const querySchema = z.object({ q: z.string().trim().min(1).max(100) })

// Plan §3.8 „ohne Präfix / kein Treffer → Suche über Aufgaben, Konten, Notizen, Todos“
export default defineEventHandler(async (event) => {
  const { q } = await getValidatedQuery(event, querySchema.parse)

  const [aufgaben, konten, notizen, todos] = await Promise.all([
    db.select({ id: aufgabe.id, key: aufgabe.key, titel: aufgabe.titel, status: aufgabe.status, kontoFarbe: konto.farbe })
      .from(aufgabe)
      .innerJoin(konto, eq(konto.id, aufgabe.kontoId))
      .where(or(enthaelt(aufgabe.titel, q), enthaelt(aufgabe.key, q)))
      .orderBy(desc(sql`${aufgabe.status} = 'offen'`), desc(aufgabe.id))
      .limit(8),
    db.select({ id: konto.id, name: konto.name, farbe: konto.farbe, status: konto.status })
      .from(konto)
      .where(or(enthaelt(konto.name, q), enthaelt(konto.aliase, q)))
      .limit(5),
    db.select({ id: notiz.id, titel: notiz.titel, angepinnt: notiz.angepinnt })
      .from(notiz)
      .where(or(enthaelt(notiz.titel, q), enthaelt(notiz.inhalt, q)))
      .orderBy(desc(sql`${enthaelt(notiz.titel, q)}`), desc(notiz.geaendertAm))
      .limit(8),
    db.select({ id: todo.id, art: todo.art, text: todo.text, wer: todo.wer })
      .from(todo)
      .where(and(isNull(todo.erledigtAm), or(enthaelt(todo.text, q), enthaelt(todo.wer, q))))
      .limit(8),
  ])

  return { aufgaben, konten, notizen, todos }
})
