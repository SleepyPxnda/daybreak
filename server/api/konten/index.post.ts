import { konto } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const daten = await readValidatedBody(event, kontoAnlegenSchema.parse)
  await pruefeAliase(daten.aliase)
  const [neu] = await db.insert(konto).values(daten).returning()
  return neu!
})
