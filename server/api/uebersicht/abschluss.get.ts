import { monatsabschluss } from '#shared/utils/uebersicht'

// Monatsabschluss: pro Tag Start, Ende, Pause, Ist/Soll und gebuchte Zeit je Konto (mit Keys)
export default defineEventHandler(async (event) => {
  const { von, bis } = await getValidatedQuery(event, zeitraumQuerySchema.parse)

  const bloecke = await ladeGebuchteArbeit(von, bis)
  const infos = await ladeTagesInfos(von, bis, await ladeEinstellungen())

  return monatsabschluss(bloecke, infos).map((tag, i) => {
    const { typ, feiertag, istArbeitstag, notiz } = infos[i]!
    return { ...tag, typ, feiertag, istArbeitstag, notiz }
  })
})
