import type { ErinnerungArt } from '#shared/utils/erinnerung'
import { pruefeErinnerung } from '#shared/utils/erinnerung'
import type { TimelineBlock } from '~/utils/timeline'

const SPEICHER_KEY = 'daybreak-erinnerungen'
const PRUEF_INTERVALL_MS = 5 * 60_000

type Zuletzt = Partial<Record<ErinnerungArt, number>>

/** Letzte Erinnerungen von heute – überlebt Reloads, damit nicht doppelt erinnert wird. */
function ladeZuletzt(datum: string): Zuletzt {
  try {
    const gespeichert = JSON.parse(localStorage.getItem(SPEICHER_KEY) ?? 'null') as { datum: string, zuletzt: Zuletzt } | null
    return gespeichert?.datum === datum ? gespeichert.zuletzt : {}
  }
  catch {
    return {}
  }
}

function speichereZuletzt(datum: string, zuletzt: Zuletzt) {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify({ datum, zuletzt }))
  }
  catch {
    // ohne localStorage wird nach einem Reload ggf. einmal erneut erinnert – unkritisch
  }
}

/** Browser-Benachrichtigungen, wenn heute zu wenig gebucht ist (Regeln in shared/utils/erinnerung.ts). Läuft nur, solange ein Tab offen ist. */
export function useErinnerungen() {
  const { data: einstellungen } = useEinstellungen()

  async function pruefen() {
    const e = einstellungen.value
    if (!e?.erinnerungenAktiv || !('Notification' in window) || Notification.permission !== 'granted') return

    const datum = heute()
    const [{ bloecke }, tage] = await Promise.all([
      api<{ bloecke: TimelineBlock[] }>('/api/blocks', { query: { von: datum, bis: datum } }),
      api<{ soll: number }[]>('/api/tage', { query: { von: datum, bis: datum } }),
    ])
    const d = new Date()
    const jetzt = d.getHours() * 60 + d.getMinutes()
    const zuletzt = ladeZuletzt(datum)
    const erinnerung = pruefeErinnerung({
      jetzt,
      sollMin: tage[0]?.soll ?? 0,
      bloecke,
      arbeitsbeginn: e.arbeitsbeginn,
      lueckeMin: e.erinnerungLueckeMin,
      feierabend: e.erinnerungFeierabend,
      zuletzt,
    })
    if (!erinnerung) return

    speichereZuletzt(datum, { ...zuletzt, [erinnerung.art]: jetzt })
    // Wer Daybreak gerade vor sich hat, sieht den Stand selbst – zählt trotzdem als erinnert
    if (document.visibilityState === 'visible' && document.hasFocus()) return

    const n = new Notification(erinnerung.titel, { body: erinnerung.text, tag: `daybreak-${erinnerung.art}`, icon: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      n.close()
      navigateTo(erinnerung.art === 'feierabend' ? { path: '/', query: { abschluss: '1' } } : '/')
    }
  }

  function pruefenSicher() {
    // Netzwerkfehler o. Ä.: beim nächsten Durchlauf erneut versuchen
    pruefen().catch(err => console.warn('Erinnerung konnte nicht geprüft werden', err))
  }

  onMounted(() => {
    pruefenSicher()
    const timer = setInterval(pruefenSicher, PRUEF_INTERVALL_MS)
    onBeforeUnmount(() => clearInterval(timer))
  })
}
