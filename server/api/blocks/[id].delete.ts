import { eq } from 'drizzle-orm'
import { block, vorlageAusnahme } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  return db.transaction(async (tx) => {
    const [geloescht] = await tx.delete(block).where(eq(block.id, id)).returning()
    if (!geloescht) nichtGefunden('Block')
    // Plan §3.2: gelöschter Einzeltermin wird als „ausgelassen“ gemerkt und nicht neu erzeugt
    if (geloescht.vorlageId != null) {
      await tx.insert(vorlageAusnahme).values({ vorlageId: geloescht.vorlageId, datum: geloescht.datum }).onConflictDoNothing()
    }
    return geloescht
  })
})
