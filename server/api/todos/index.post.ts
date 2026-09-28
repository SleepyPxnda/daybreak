import { eq, sql } from 'drizzle-orm'
import { todo } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const eingabe = await readValidatedBody(event, todoAnlegenSchema.parse)
  const daten = bereinigeTodo(eingabe.art, eingabe)
  if (daten.aufgabeId != null || daten.kontoId != null) {
    Object.assign(daten, await loeseZielAuf({ kind: 'arbeit', aufgabeId: daten.aufgabeId, kontoId: daten.aufgabeId ? null : daten.kontoId }))
  }

  // Neue Einträge ans Ende ihrer Liste
  const [{ max } = { max: null }] = await db.select({ max: sql<number | null>`max(${todo.sortierung})` }).from(todo).where(eq(todo.art, daten.art))
  const [neu] = await db.insert(todo).values({ ...daten, sortierung: (max ?? -1) + 1 }).returning()
  return neu!
})
