import { sql } from 'drizzle-orm'
import { db } from '../../db/client'

// All used tags with count (for the tag filter)
export default defineEventHandler(async () => {
  const rows = await db.all<{ tag: string, count: number }>(
    sql`select value as tag, count(*) as count from notiz, json_each(notiz.tags) group by value order by value`,
  )
  return rows.map(z => ({ tag: z.tag, count: Number(z.count) }))
})
