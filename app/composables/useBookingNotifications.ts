import type { BookingNotificationKind } from '#shared/utils/bookingNotification'
import { checkBookingNotification } from '#shared/utils/bookingNotification'
import type { TimelineBlock } from '~/utils/timeline'

const STORAGE_KEY = 'daybreak-booking-notifications'
const CHECK_INTERVAL_MS = 5 * 60_000

type LastNotifiedMinute = Partial<Record<BookingNotificationKind, number>>

/** Last notifications of today - survives reloads so nobody is notified twice. */
function loadLastNotifiedMinute(date: string): LastNotifiedMinute {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { date: string, lastNotifiedMinute: LastNotifiedMinute } | null
    return saved?.date === date ? saved.lastNotifiedMinute : {}
  }
  catch {
    return {}
  }
}

function saveLastNotifiedMinute(date: string, lastNotifiedMinute: LastNotifiedMinute) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, lastNotifiedMinute }))
  }
  catch {
    // without localStorage a notification may repeat once after a reload - harmless
  }
}

/** Browser notifications when too little is booked today (rules in shared/utils/bookingNotification.ts). Only runs while a tab is open. */
export function useBookingNotifications() {
  const { data: settings } = useSettings()

  async function check() {
    const e = settings.value
    if (!e?.erinnerungenAktiv || !('Notification' in window) || Notification.permission !== 'granted') return

    const date = today()
    const [{ blocks }, days] = await Promise.all([
      api<{ blocks: TimelineBlock[] }>('/api/blocks', { query: { from: date, to: date } }),
      api<{ target: number }[]>('/api/days', { query: { from: date, to: date } }),
    ])
    const d = new Date()
    const currentMinute = d.getHours() * 60 + d.getMinutes()
    const lastNotifiedMinute = loadLastNotifiedMinute(date)
    const bookingNotification = checkBookingNotification({
      currentMinute,
      targetMin: days[0]?.target ?? 0,
      blocks,
      workStart: e.arbeitsbeginn,
      gapMin: e.erinnerungLueckeMin,
      endOfDay: e.erinnerungFeierabend,
      lastNotifiedMinute,
    })
    if (!bookingNotification) return

    saveLastNotifiedMinute(date, { ...lastNotifiedMinute, [bookingNotification.kind]: currentMinute })
    // Whoever is looking at Daybreak sees the status anyway - still counts as notified
    if (document.visibilityState === 'visible' && document.hasFocus()) return

    const n = new Notification(bookingNotification.title, { body: bookingNotification.text, tag: `daybreak-${bookingNotification.kind}`, icon: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      n.close()
      navigateTo(bookingNotification.kind === 'end_of_day' ? { path: '/', query: { dayClosing: '1' } } : '/')
    }
  }

  function checkSafe() {
    // Network error or similar: try again on the next run
    check().catch(err => console.warn('Erinnerung konnte nicht geprüft werden', err))
  }

  onMounted(() => {
    checkSafe()
    const timer = setInterval(checkSafe, CHECK_INTERVAL_MS)
    onBeforeUnmount(() => clearInterval(timer))
  })
}
