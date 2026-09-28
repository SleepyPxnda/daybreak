import { getTableColumns } from 'drizzle-orm'
import { aufgabe, block, konto } from '../db/schema'

/** Block-Spalten + Anzeige-Infos (Aufgabe/Konto) – für Queries mit LEFT JOIN aufgabe/konto. */
export const blockMitAnzeige = {
  ...getTableColumns(block),
  aufgabeKey: aufgabe.key,
  aufgabeTitel: aufgabe.titel,
  kontoName: konto.name,
  kontoFarbe: konto.farbe,
}
