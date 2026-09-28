import { toast } from 'vue-sonner'

/** Fehlermeldung aus einer $fetch-Antwort (statusMessage vom Server). */
export function apiFehlermeldung(error: unknown): string {
  const e = error as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, message?: string }
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || 'Unbekannter Fehler'
}

/**
 * Führt eine Server-Aktion aus, zeigt Fehler als Toast und aktualisiert danach die angegebenen useFetch-Keys.
 * Liefert das Ergebnis oder `undefined` bei Fehler.
 */
export async function aktion<T>(fn: () => Promise<T>, aktualisieren: string[] = []): Promise<T | undefined> {
  try {
    const ergebnis = await fn()
    if (aktualisieren.length) await refreshNuxtData(aktualisieren)
    return ergebnis
  }
  catch (error) {
    toast.error(apiFehlermeldung(error))
    return undefined
  }
}
