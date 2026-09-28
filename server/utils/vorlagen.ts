import { and, eq, gte, lte } from 'drizzle-orm'
import { block, vorlage, vorlageAusnahme } from '../db/schema'
import { db } from '../db/client'
import type { Einstellungen } from '#shared/utils/einstellungen'
import { tagesInfo } from '#shared/utils/soll'
import { materialisiere } from '#shared/utils/vorlagen'
import type { Datum } from '#shared/utils/zeit'
import { heute } from '#shared/utils/zeit'
import { ladeTagEintraege } from './tage'

/**
 * Plan §3.2: erzeugt fehlende geplante Blöcke aller aktiven Vorlagen im Zeitraum (max. 14 Tage voraus).
 * Liefert die Konflikte (Zeitraum belegt) für das Hinweis-Badge.
 */
export async function materialisiereVorlagen(von: Datum, bis: Datum, einstellungen: Einstellungen) {
  const vorlagen = await db.select().from(vorlage).where(eq(vorlage.aktiv, true))
  if (vorlagen.length === 0) return { konflikte: [] }

  const [tage, ausnahmen, bestehend] = await Promise.all([
    ladeTagEintraege(von, bis),
    db.select().from(vorlageAusnahme).where(and(gte(vorlageAusnahme.datum, von), lte(vorlageAusnahme.datum, bis))),
    db.select({ datum: block.datum, start: block.start, ende: block.ende, vorlageId: block.vorlageId })
      .from(block)
      .where(and(gte(block.datum, von), lte(block.datum, bis))),
  ])

  const { neu, konflikte } = materialisiere({
    vorlagen,
    von,
    bis,
    heute: heute(),
    tagesInfo: datum => tagesInfo(datum, tage[datum], einstellungen),
    ausnahmen,
    bestehend,
  })

  if (neu.length) {
    const vorlagenById = new Map(vorlagen.map(v => [v.id, v]))
    await db.insert(block).values(neu.map((b) => {
      const v = vorlagenById.get(b.vorlageId)!
      return {
        ...b,
        kind: 'arbeit' as const,
        status: 'geplant' as const,
        aufgabeId: v.aufgabeId,
        kontoId: v.kontoId,
      }
    })).onConflictDoNothing()
  }

  return { konflikte }
}
