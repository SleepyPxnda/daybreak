import { asc, eq, getTableColumns } from 'drizzle-orm'
import { aufgabe, konto, vorlage } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(() =>
  db.select({
    ...getTableColumns(vorlage),
    aufgabeKey: aufgabe.key,
    aufgabeTitel: aufgabe.titel,
    kontoName: konto.name,
    kontoFarbe: konto.farbe,
  })
    .from(vorlage)
    .leftJoin(aufgabe, eq(aufgabe.id, vorlage.aufgabeId))
    .leftJoin(konto, eq(konto.id, vorlage.kontoId))
    .orderBy(asc(vorlage.start)),
)
