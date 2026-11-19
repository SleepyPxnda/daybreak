/** Current minute since midnight, updated every minute (browser only; undefined on the server). */
export function useCurrentMinute() {
  const currentMinute = ref<number>()
  function refresh() {
    const d = new Date()
    currentMinute.value = d.getHours() * 60 + d.getMinutes()
  }
  onMounted(() => {
    refresh()
    const timer = setInterval(refresh, 60_000)
    onBeforeUnmount(() => clearInterval(timer))
  })
  return currentMinute
}
