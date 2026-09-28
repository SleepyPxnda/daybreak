import { runMigrations } from '../db/migrate'

export default defineEventHandler(async () => {
  await runMigrations()
})
