import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './client'

let ready: Promise<void> | undefined

/** Wendet ausstehende Migrationen aus `./drizzle` genau einmal pro Prozess an. */
export function runMigrations() {
  ready ??= migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  return ready
}
