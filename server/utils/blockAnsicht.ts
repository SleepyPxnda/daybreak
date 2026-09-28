import { getTableColumns } from 'drizzle-orm'
import { aufgabe, block, konto, vorlage } from '../db/schema'

/** Block-Spalten + Anzeige-Infos (Aufgabe/Konto/Vorlage) – für Queries mit LEFT JOIN aufgabe/konto/vorlage. */
export const blockMitAnzeige = {
  ...getTableColumns(block),
  aufgabeKey: aufgabe.key,
  aufgabeTitel: aufgabe.titel,
  kontoName: konto.name,
  kontoFarbe: konto.farbe,
  vorlageName: vorlage.name,
}
