import { z } from 'zod'
import { datumSchema, uhrzeitSchema } from '#shared/utils/einstellungen'

/** Felder ohne Defaults – Basis für PATCH. */
export const vorlageFelder = z.object({
  aufgabeId: z.number().int().positive().nullable(),
  kontoId: z.number().int().positive().nullable(),
  start: uhrzeitSchema,
  ende: uhrzeitSchema,
  wochentage: z.array(z.number().int().min(1).max(7)).min(1, 'Mindestens ein Wochentag'),
  intervallWochen: z.number().int().min(1).max(8),
  gueltigAb: datumSchema,
  gueltigBis: datumSchema.nullable(),
  aktiv: z.boolean(),
})

export const vorlageAnlegenSchema = vorlageFelder.extend({
  aufgabeId: vorlageFelder.shape.aufgabeId.default(null),
  kontoId: vorlageFelder.shape.kontoId.default(null),
  intervallWochen: vorlageFelder.shape.intervallWochen.default(1),
  gueltigBis: vorlageFelder.shape.gueltigBis.default(null),
  aktiv: vorlageFelder.shape.aktiv.default(true),
  /** „Als wiederkehrend speichern …“ aus dem Block-Menü: diesen Block mit der Vorlage verknüpfen */
  ausBlockId: z.number().int().positive().optional(),
})
