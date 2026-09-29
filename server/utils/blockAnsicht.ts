import { and, asc, eq, getTableColumns, gte, lte } from 'drizzle-orm'
import { aufgabe, block, konto, vorlage } from '../db/schema'
import { db } from '../db/client'
import type { Datum } from '#shared/utils/zeit'

/** Block-Spalten + Anzeige-Infos (Aufgabe/Konto/Vorlage) – für Queries mit LEFT JOIN aufgabe/konto/vorlage. */
export const blockMitAnzeige = {
  ...getTableColumns(block),
  aufgabeKey: aufgabe.key,
  aufgabeTitel: aufgabe.titel,
  kontoName: konto.name,
  kontoFarbe: konto.farbe,
  vorlageName: vorlage.name,
}

/** Gebuchte Arbeitsblöcke im Zeitraum (inklusive) mit Anzeige-Infos, chronologisch. */
export function ladeGebuchteArbeit(von: Datum, bis: Datum) {
  return db.select(blockMitAnzeige)
    .from(block)
    .leftJoin(aufgabe, eq(aufgabe.id, block.aufgabeId))
    .leftJoin(konto, eq(konto.id, block.kontoId))
    .leftJoin(vorlage, eq(vorlage.id, block.vorlageId))
    .where(and(gte(block.datum, von), lte(block.datum, bis), eq(block.kind, 'arbeit'), eq(block.status, 'gebucht')))
    .orderBy(asc(block.datum), asc(block.start))
}
