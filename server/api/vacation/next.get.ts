import { nextVacation } from '#shared/utils/vacation'
import { dateRange, today as todayDate, addDays } from '#shared/utils/time'

// Today card "next vacation" + reminder from a configurable lead time
export default defineEventHandler(async () => {
  const today = todayDate()
  const settings = await loadSettings()
  // Some look-back so that an ongoing vacation is fully detected
  const days = await loadDayEntries(addDays(today, -60), addDays(today, 366))
  const vacation = nextVacation(today, days, settings)
  // Confirmed if all vacation days in the range are confirmed (newly added days cancel this)
  const vacationDays = vacation ? dateRange(vacation.from, vacation.to).map(d => days[d]).filter(t => t?.type === 'urlaub' || t?.type === 'halb_urlaub') : []
  return {
    vacation: vacation && { ...vacation, confirmed: vacationDays.length > 0 && vacationDays.every(t => t!.confirmed) },
    notify: !!vacation && !vacation.running && vacation.daysUntil <= settings.urlaubErinnerungTage,
    bookingNotificationText: settings.urlaubErinnerungText,
  }
})
