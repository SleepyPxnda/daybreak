export default defineEventHandler(async (event) => {
  const { von, bis } = await getValidatedQuery(event, zeitraumQuerySchema.parse)
  return ladeTagesInfos(von, bis, await ladeEinstellungen())
})
