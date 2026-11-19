export default defineEventHandler(async (event) => {
  const { from, to } = await getValidatedQuery(event, rangeQuerySchema.parse)
  return loadDayInfos(from, to, await loadSettings())
})
