import { useEventListener } from '@vueuse/core'

const FOCUS_REFRESH_MIN_GAP_MS = 2000

/**
 * Reloads all useFetch data when the tab comes back to the foreground and moves `useToday()` to a new day.
 * The health probe comes first: a failed useFetch resets its data, so nothing may change while the server is unreachable.
 */
export function useRefreshOnFocus() {
  const todayState = useToday()
  let lastRefreshAt = 0
  let refreshRunning = false

  async function refresh() {
    if (refreshRunning || Date.now() - lastRefreshAt < FOCUS_REFRESH_MIN_GAP_MS) return
    refreshRunning = true
    try {
      try {
        await api('/api/health')
      }
      catch {
        // Server not reachable (yet): keep the shown data and day, try again on the next return
        return
      }
      todayState.value = today()
      await refreshNuxtData()
    }
    finally {
      refreshRunning = false
      lastRefreshAt = Date.now()
    }
  }

  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })
  useEventListener(window, 'focus', refresh)
}
