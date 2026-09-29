import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../db/schema'
import { db } from '../db/client'
import { geplantMinuten, istMinuten } from '#shared/utils/bloecke'
import { datumSchema } from '#shared/utils/einstellungen'
import { kontostand } from '#shared/utils/saldo'
import { tagesInfo } from '#shared/utils/soll'
import { heute as heuteDatum } from '#shared/utils/zeit'

const querySchema = z.object({ heute: datumSchema.optional() })

// Saldo-Widget (Plan §3.4): „Konto bis gestern: +3:15 · heute: 5:30 / 8:00“
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const heute = query.heute ?? heuteDatum()
  const einstellungen = await ladeEinstellungen()

  const kontoBisGestern = kontostand(await ladeSaldoEingabe(heute, einstellungen))

  const heuteBloecke = await db.select().from(block).where(eq(block.datum, heute))
  const heuteEintrag = (await ladeTagEintraege(heute, heute))[heute]

  return {
    kontoBisGestern,
    heute: {
      ...tagesInfo(heute, heuteEintrag, einstellungen),
      ist: istMinuten(heuteBloecke),
      geplant: geplantMinuten(heuteBloecke),
    },
  }
})
