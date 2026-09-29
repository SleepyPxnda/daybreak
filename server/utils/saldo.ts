import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { block } from '../db/schema'
import { db } from '../db/client'
import type { Einstellungen } from '#shared/utils/einstellungen'
import type { SaldoEingabe } from '#shared/utils/saldo'
import type { Datum } from '#shared/utils/zeit'
import { plusTage } from '#shared/utils/zeit'

/** Eingabe für `kontostand`/`saldoVerlauf`: Ist je Tag und Tagesabweichungen vom Startdatum bis gestern. */
export async function ladeSaldoEingabe(heute: Datum, einstellungen: Einstellungen): Promise<SaldoEingabe> {
  const start = einstellungen.stundenkontoStart
  const gestern = plusTage(heute, -1)
  if (start.datum > gestern) return { start, heute, istProTag: {}, tage: {}, einstellungen }

  const istZeilen = await db.select({ datum: block.datum, minuten: sql<number>`sum(${block.ende} - ${block.start})` })
    .from(block)
    .where(and(eq(block.kind, 'arbeit'), eq(block.status, 'gebucht'), gte(block.datum, start.datum), lte(block.datum, gestern)))
    .groupBy(block.datum)

  return {
    start,
    heute,
    istProTag: Object.fromEntries(istZeilen.map(z => [z.datum, Number(z.minuten)])),
    tage: await ladeTagEintraege(start.datum, gestern),
    einstellungen,
  }
}
