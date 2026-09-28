import { z } from 'zod'
import { konto } from '../db/schema'
import { db } from '../db/client'
import { KONTO_FARBEN } from '#shared/utils/konten'

/** Felder ohne Defaults – Basis für PATCH (partial darf nichts zurücksetzen). */
export const kontoFelder = z.object({
  name: z.string().trim().min(1).max(100),
  farbe: z.enum(KONTO_FARBEN),
  aliase: z.array(z.string().trim().toLowerCase().min(1).max(30).regex(/^\S+$/, 'Alias ohne Leerzeichen')),
  status: z.enum(['aktiv', 'archiviert']),
})

export const kontoAnlegenSchema = kontoFelder.extend({
  aliase: kontoFelder.shape.aliase.default([]),
  status: kontoFelder.shape.status.default('aktiv'),
})

/** Aliase müssen über alle Konten eindeutig sein (sonst ist die Schnelleingabe mehrdeutig). */
export async function pruefeAliase(aliase: string[], eigeneId?: number) {
  if (new Set(aliase).size !== aliase.length) throw createError({ statusCode: 400, statusMessage: 'Alias doppelt angegeben' })
  const andere = (await db.select({ id: konto.id, name: konto.name, aliase: konto.aliase }).from(konto)).filter(k => k.id !== eigeneId)
  for (const alias of aliase) {
    const besitzer = andere.find(k => k.aliase.includes(alias))
    if (besitzer) throw createError({ statusCode: 409, statusMessage: `Alias „${alias}“ gehört schon zu ${besitzer.name}` })
  }
}
