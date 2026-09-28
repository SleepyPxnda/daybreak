import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { settings, urlaubsanspruch } from '../db/schema'
import { db } from '../db/client'
import { urlaubskonto, vorbelegungUrlaub } from '#shared/utils/urlaub'
import { heute } from '#shared/utils/zeit'
import { ladeTagEintraege } from './tage'

/** Tage in 0,5-Schritten */
const tageSchema = z.number().min(-366).max(366).refine(t => Number.isInteger(t * 2), 'Nur halbe oder ganze Tage')

export const postenFelder = z.object({
  jahr: z.number().int().min(2000).max(2100),
  art: z.enum(['grund', 'zusatz', 'rest']),
  bezeichnung: z.string().trim().min(1).max(100),
  tage: tageSchema,
})

/** Plan §3.5: einmalig beim ersten Start für das laufende Jahr vorbelegen (Flag in settings). */
export async function stelleUrlaubVorbelegungSicher() {
  const [flag] = await db.select().from(settings).where(eq(settings.key, 'urlaubVorbelegt'))
  if (flag) return
  const jahr = Number(heute().slice(0, 4))
  await db.transaction(async (tx) => {
    const [vorhanden] = await tx.select({ id: urlaubsanspruch.id }).from(urlaubsanspruch).limit(1)
    if (!vorhanden) await tx.insert(urlaubsanspruch).values(vorbelegungUrlaub(jahr).map(p => ({ ...p, jahr })))
    await tx.insert(settings).values({ key: 'urlaubVorbelegt', value: true }).onConflictDoNothing()
  })
}

export async function ladeUrlaubsposten(jahr: number) {
  return db.select().from(urlaubsanspruch).where(eq(urlaubsanspruch.jahr, jahr)).orderBy(asc(urlaubsanspruch.id))
}

/** Urlaubskonto eines Jahres (Anspruch, genommen, geplant, Rest). */
export async function ladeUrlaubskonto(jahr: number) {
  const [posten, tage, einstellungen] = await Promise.all([
    ladeUrlaubsposten(jahr),
    ladeTagEintraege(`${jahr}-01-01`, `${jahr}-12-31`),
    ladeEinstellungen(),
  ])
  return { posten, konto: urlaubskonto(jahr, posten, tage, heute(), einstellungen) }
}
