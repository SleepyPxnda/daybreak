import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { tag } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { tagesInfo } from '#shared/utils/soll'
import { datumsBereich, tageZwischen } from '#shared/utils/zeit'

const schema = z.object({
  von: datumSchema,
  bis: datumSchema,
  typ: z.enum(['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag']),
}).refine(b => b.von <= b.bis && tageZwischen(b.von, b.bis) <= 366, 'Ungültiger Zeitraum')

/**
 * Kalender (Plan §5): Tagestyp für einen Bereich setzen.
 * Abwesenheiten nur an regulären Arbeitstagen speichern (Wochenende/Feiertag zählt ohnehin nicht);
 * „Arbeit“ setzt zurück – Einträge ohne Soll-Override/Notiz werden gelöscht. Override/Notiz bleiben erhalten.
 */
export default defineEventHandler(async (event) => {
  const { von, bis, typ } = await readValidatedBody(event, schema.parse)
  const einstellungen = await ladeEinstellungen()
  const vorhanden = await ladeTagEintraege(von, bis)

  await db.transaction(async (tx) => {
    if (typ === 'arbeit') {
      const loeschen = Object.values(vorhanden).filter(e => e.sollOverride == null && !e.notiz).map(e => e.datum)
      if (loeschen.length) await tx.delete(tag).where(inArray(tag.datum, loeschen))
      const behalten = Object.values(vorhanden).filter(e => !loeschen.includes(e.datum)).map(e => e.datum)
      if (behalten.length) await tx.update(tag).set({ typ: 'arbeit' }).where(inArray(tag.datum, behalten))
      return
    }
    const arbeitstage = datumsBereich(von, bis).filter(d => tagesInfo(d, undefined, einstellungen).istArbeitstag)
    for (const datum of arbeitstage) {
      await tx.insert(tag).values({ datum, typ }).onConflictDoUpdate({ target: tag.datum, set: { typ } })
    }
  })

  return { ok: true }
})
