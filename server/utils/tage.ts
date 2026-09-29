import { and, gte, lte } from 'drizzle-orm'
import { tag } from '../db/schema'
import { db } from '../db/client'
import type { Einstellungen } from '#shared/utils/einstellungen'
import type { TagEintrag, TagesInfo } from '#shared/utils/soll'
import { tagesInfo } from '#shared/utils/soll'
import type { Datum } from '#shared/utils/zeit'
import { datumsBereich } from '#shared/utils/zeit'

export async function ladeTagEintraege(von: Datum, bis: Datum): Promise<Record<Datum, TagEintrag & { notiz: string | null, blocker: boolean }>> {
  const zeilen = await db.select().from(tag).where(and(gte(tag.datum, von), lte(tag.datum, bis)))
  return Object.fromEntries(zeilen.map(z => [z.datum, z]))
}

export type TagesInfoMitNotiz = TagesInfo & { notiz: string | null, sollOverride: number | null, blocker: boolean }

/** TagesInfo (Soll, Feiertag, Typ) für jeden Tag im Zeitraum, plus Notiz, gespeichertem Soll-Override und Blocker. */
export async function ladeTagesInfos(von: Datum, bis: Datum, einstellungen: Einstellungen): Promise<TagesInfoMitNotiz[]> {
  const eintraege = await ladeTagEintraege(von, bis)
  return datumsBereich(von, bis).map(datum => ({
    ...tagesInfo(datum, eintraege[datum], einstellungen),
    notiz: eintraege[datum]?.notiz ?? null,
    sollOverride: eintraege[datum]?.sollOverride ?? null,
    blocker: eintraege[datum]?.blocker ?? false,
  }))
}
