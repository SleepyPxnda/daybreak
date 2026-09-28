/** Konten, alle Aufgaben und Einstellungen – gemeinsam genutzt (Schnelleingabe, Zielauswahl, Timeline). */
export function useKonten() {
  return useFetch('/api/konten', { key: 'konten', default: () => [] })
}

export function useAlleAufgaben() {
  return useFetch('/api/aufgaben', { key: 'aufgaben', default: () => [] })
}

export function useEinstellungen() {
  return useFetch('/api/settings', { key: 'einstellungen' })
}

/** Nach Änderungen an Konten/Aufgaben/Blöcken neu laden. */
export const STAMMDATEN_KEYS = ['konten', 'aufgaben', 'aufgaben-in-arbeit']
