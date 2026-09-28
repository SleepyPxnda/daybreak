import { getTableColumns } from 'drizzle-orm'
import { z } from 'zod'
import { aufgabe, konto, todo } from '../db/schema'
import { datumSchema } from '#shared/utils/einstellungen'

/** Felder ohne Defaults – Basis für PATCH. */
export const todoFelder = z.object({
  art: z.enum(['merker', 'daily', 'warten']),
  text: z.string().trim().min(1).max(1000),
  wer: z.string().trim().max(100).transform(w => w || null).nullable(),
  nachfassenAm: datumSchema.nullable(),
  faelligAm: datumSchema.nullable(),
  aufgabeId: z.number().int().positive().nullable(),
  kontoId: z.number().int().positive().nullable(),
})

export const todoAnlegenSchema = todoFelder.partial().required({ art: true, text: true })

/** Felder, die zur Art nicht passen, verwerfen (wer/nachfassen nur bei warten, fällig nur bei merker). */
export function bereinigeTodo<T extends Partial<z.infer<typeof todoFelder>>>(art: string, daten: T): T {
  const sauber = { ...daten }
  if (art !== 'warten') {
    if ('wer' in sauber) sauber.wer = null
    if ('nachfassenAm' in sauber) sauber.nachfassenAm = null
  }
  if (art !== 'merker' && 'faelligAm' in sauber) sauber.faelligAm = null
  return sauber
}

/** Todo + Bezug (Aufgabe/Konto) für die Anzeige – für Queries mit LEFT JOIN aufgabe/konto. */
export const todoMitBezug = {
  ...getTableColumns(todo),
  aufgabeKey: aufgabe.key,
  aufgabeTitel: aufgabe.titel,
  kontoName: konto.name,
  kontoFarbe: konto.farbe,
}
