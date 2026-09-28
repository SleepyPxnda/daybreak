import { getTableColumns, sql } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, block } from '../db/schema'

/** Felder ohne Defaults – Basis für PATCH. */
export const aufgabeFelder = z.object({
  kontoId: z.number().int().positive(),
  key: z.string().trim().max(50).transform(k => k || null).nullable(),
  titel: z.string().trim().min(1).max(200),
  status: z.enum(['offen', 'abgeschlossen']),
  schaetzungMin: z.number().int().positive().max(100_000).nullable(),
})

export const aufgabeAnlegenSchema = aufgabeFelder.extend({
  key: aufgabeFelder.shape.key.optional(),
  status: aufgabeFelder.shape.status.default('offen'),
  schaetzungMin: aufgabeFelder.shape.schaetzungMin.optional(),
})

/** Spalten einer Aufgabe + Summen gebucht/geplant (nur Arbeitsblöcke) – für Queries mit LEFT JOIN block. */
export const aufgabeMitSummen = {
  ...getTableColumns(aufgabe),
  gebuchtMin: sql<number>`coalesce(sum(case when ${block.kind} = 'arbeit' and ${block.status} = 'gebucht' then ${block.ende} - ${block.start} end), 0)`,
  geplantMin: sql<number>`coalesce(sum(case when ${block.kind} = 'arbeit' and ${block.status} = 'geplant' then ${block.ende} - ${block.start} end), 0)`,
}
