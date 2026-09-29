import { gruppiereUebersicht } from '#shared/utils/uebersicht'

// Übersicht (Plan §5.4): gebuchte Zeit gruppiert Konto → Aufgabe → Tage, dazu Soll des Zeitraums
export default defineEventHandler(async (event) => {
  const { von, bis } = await getValidatedQuery(event, zeitraumQuerySchema.parse)

  const bloecke = await ladeGebuchteArbeit(von, bis)
  const tage = await ladeTagesInfos(von, bis, await ladeEinstellungen())

  return {
    ...gruppiereUebersicht(bloecke),
    soll: tage.reduce((s, t) => s + t.soll, 0),
  }
})
