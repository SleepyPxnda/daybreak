import { and, eq, gt } from 'drizzle-orm'
import { block, vorlage, vorlageAusnahme } from '../../db/schema'
import { db } from '../../db/client'
import { heute } from '#shared/utils/zeit'

// Zukünftige geplante Termine verschwinden; vergangene/gebuchte Blöcke bleiben als normale Blöcke erhalten.
export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  return db.transaction(async (tx) => {
    await tx.delete(block).where(and(eq(block.vorlageId, id), eq(block.status, 'geplant'), gt(block.datum, heute())))
    await tx.update(block).set({ vorlageId: null }).where(eq(block.vorlageId, id))
    await tx.delete(vorlageAusnahme).where(eq(vorlageAusnahme.vorlageId, id))
    const [geloescht] = await tx.delete(vorlage).where(eq(vorlage.id, id)).returning()
    return geloescht ?? nichtGefunden('Vorlage')
  })
})
