import { groupOverview } from '#shared/utils/overview'

// Overview: booked time grouped account -> task -> days, plus target of the range
export default defineEventHandler(async (event) => {
  const { from, to } = await getValidatedQuery(event, rangeQuerySchema.parse)

  const blocks = await loadBookedWork(from, to)
  const days = await loadDayInfos(from, to, await loadSettings())

  return {
    ...groupOverview(blocks),
    target: days.reduce((s, t) => s + t.target, 0),
  }
})
