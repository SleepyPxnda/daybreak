import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import { z } from 'zod'
import { bestaetigtBeiTypwechsel, tag } from '../../db/schema'
import { db } from '../../db/client'
import { datumSchema } from '#shared/utils/einstellungen'
import { tagesInfo } from '#shared/utils/soll'
import { datumsBereich, tageZwischen } from '#shared/utils/zeit'

const bereich = { von: datumSchema, bis: datumSchema }
const schema = z.union([
  z.object({ ...bereich, typ: z.enum(['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag']) }),
  z.object({ ...bereich, blocker: z.boolean() }),
]).refine(b => b.von <= b.bis && tageZwischen(b.von, b.bis) <= 366, 'Ungültiger Zeitraum')

/**
 * Kalender (Plan §5): Tagestyp oder Blocker für einen Bereich setzen.
 * Abwesenheiten und Blocker nur an regulären Arbeitstagen speichern (Wochenende/Feiertag zählt ohnehin nicht).
 * „Arbeit“ setzt zurück (auch den Blocker) – Einträge ohne Soll-Override/Notiz werden gelöscht, Override/Notiz bleiben erhalten.
 * Blocker ändern den Tagestyp nicht; „Blocker entfernen“ räumt danach leere Einträge weg.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const { von, bis } = body
  const einstellungen = await ladeEinstellungen()
  const vorhanden = await ladeTagEintraege(von, bis)
  const arbeitstage = datumsBereich(von, bis).filter(d => tagesInfo(d, undefined, einstellungen).istArbeitstag)
  const imBereich = and(gte(tag.datum, von), lte(tag.datum, bis))
  // Einträge ohne jede Abweichung (Plan §4: nur Abweichungen speichern)
  const leer = and(imBereich, eq(tag.typ, 'arbeit'), isNull(tag.sollOverride), isNull(tag.notiz), eq(tag.blocker, false))

  await db.transaction(async (tx) => {
    if ('blocker' in body) {
      if (body.blocker) {
        for (const datum of arbeitstage) {
          await tx.insert(tag).values({ datum, typ: 'arbeit', blocker: true }).onConflictDoUpdate({ target: tag.datum, set: { blocker: true } })
        }
      }
      else {
        await tx.update(tag).set({ blocker: false }).where(imBereich)
        await tx.delete(tag).where(leer)
      }
      return
    }

    const { typ } = body
    if (typ === 'arbeit') {
      const loeschen = Object.values(vorhanden).filter(e => e.sollOverride == null && !e.notiz).map(e => e.datum)
      if (loeschen.length) await tx.delete(tag).where(inArray(tag.datum, loeschen))
      const behalten = Object.values(vorhanden).filter(e => !loeschen.includes(e.datum)).map(e => e.datum)
      if (behalten.length) await tx.update(tag).set({ typ: 'arbeit', blocker: false }).where(inArray(tag.datum, behalten))
      return
    }
    for (const datum of arbeitstage) {
      await tx.insert(tag).values({ datum, typ }).onConflictDoUpdate({ target: tag.datum, set: { typ, bestaetigt: bestaetigtBeiTypwechsel } })
    }
  })

  return { ok: true }
})
