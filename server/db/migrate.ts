import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './client'

let ready: Promise<void> | undefined

/** Applies pending migrations from `./drizzle` exactly once per process. */
export function runMigrations() {
  ready ??= migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  return ready
}
