import { sql } from 'drizzle-orm'
import { db } from '../../db/client'

// Alle verwendeten Tags mit Anzahl (für den Tag-Filter)
export default defineEventHandler(async () => {
  const zeilen = await db.all<{ tag: string, anzahl: number }>(
    sql`select value as tag, count(*) as anzahl from notiz, json_each(notiz.tags) group by value order by value`,
  )
  return zeilen.map(z => ({ tag: z.tag, anzahl: Number(z.anzahl) }))
})
