import { asc, eq } from 'drizzle-orm'
import { aufgabe, block, konto } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const id = await idAusRoute(event)
  const [a] = await db.select(aufgabeMitSummen)
    .from(aufgabe)
    .leftJoin(block, eq(block.aufgabeId, aufgabe.id))
    .where(eq(aufgabe.id, id))
    .groupBy(aufgabe.id)
  if (!a) nichtGefunden('Aufgabe')

  const [k] = await db.select().from(konto).where(eq(konto.id, a.kontoId))
  const bloecke = await db.select().from(block).where(eq(block.aufgabeId, id)).orderBy(asc(block.datum), asc(block.start))
  return { ...a, konto: k!, bloecke }
})
