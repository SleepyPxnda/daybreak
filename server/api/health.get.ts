import { sql } from 'drizzle-orm'
import { db } from '../db/client'

export default defineEventHandler(async (event) => {
  try {
    await db.run(sql`select 1`)
    return { ok: true }
  }
  catch (error) {
    console.error('[daybreak] Health-Check: DB nicht erreichbar', error)
    setResponseStatus(event, 503)
    return { ok: false }
  }
})
