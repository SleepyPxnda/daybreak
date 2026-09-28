import { urlaubsanspruch } from '../../../db/schema'
import { db } from '../../../db/client'

export default defineEventHandler(async (event) => {
  const daten = await readValidatedBody(event, postenFelder.parse)
  const [neu] = await db.insert(urlaubsanspruch).values(daten).returning()
  return neu!
})
