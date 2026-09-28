/** Aktuelle Minute seit Mitternacht, minütlich aktualisiert (nur im Browser; auf dem Server undefined). */
export function useJetzt() {
  const jetzt = ref<number>()
  function aktualisieren() {
    const d = new Date()
    jetzt.value = d.getHours() * 60 + d.getMinutes()
  }
  onMounted(() => {
    aktualisieren()
    const timer = setInterval(aktualisieren, 60_000)
    onBeforeUnmount(() => clearInterval(timer))
  })
  return jetzt
}
