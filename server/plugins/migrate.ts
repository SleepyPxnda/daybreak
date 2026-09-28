import { runMigrations } from '../db/migrate'

// Migrationen beim Serverstart (lokal wie im Container). Nitro-Plugins laufen synchron,
// daher wartet zusätzlich server/middleware/00.migrations.ts vor jedem Request.
export default defineNitroPlugin(() => {
  runMigrations()
    .then(() => console.info('[daybreak] Migrationen angewendet'))
    .catch((error) => {
      console.error('[daybreak] Migration fehlgeschlagen', error)
      process.exit(1)
    })
})
