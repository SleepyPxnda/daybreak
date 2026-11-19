import { monthClosing } from '#shared/utils/overview'

// Month closing: per day start, end, break, actual/target and booked time per account (with keys)
export default defineEventHandler(async (event) => {
  const { from, to } = await getValidatedQuery(event, rangeQuerySchema.parse)

  const blocks = await loadBookedWork(from, to)
  const infos = await loadDayInfos(from, to, await loadSettings())

  return monthClosing(blocks, infos, await loadAccountOrder()).map((day, i) => {
    const { type, holiday, isWorkday, note } = infos[i]!
    return { ...day, type, holiday, isWorkday, note }
  })
})
