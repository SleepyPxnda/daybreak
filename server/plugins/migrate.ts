import { runMigrations } from '../db/migrate'

// Migrations on server start (locally and in the container). Nitro plugins run synchronously,
// so server/middleware/00.migrations.ts additionally waits before every request.
export default defineNitroPlugin(() => {
  runMigrations()
    .then(() => console.info('[daybreak] Migrationen angewendet'))
    .catch((error) => {
      console.error('[daybreak] Migration fehlgeschlagen', error)
      process.exit(1)
    })
})
