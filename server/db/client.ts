import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

export const databaseUrl = process.env.DATABASE_URL || 'file:./data/daybreak.db'

// libsql legt fehlende Verzeichnisse nicht selbst an
if (databaseUrl.startsWith('file:')) {
  mkdirSync(dirname(databaseUrl.slice('file:'.length)), { recursive: true })
}

const client = createClient({ url: databaseUrl })

export const db = drizzle(client, { schema })
