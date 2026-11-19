import { toast } from 'vue-sonner'

/** Error message from a $fetch response (statusMessage from the server). */
export function apiErrorMessage(error: unknown): string {
  const e = error as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, message?: string }
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || 'Unbekannter Fehler'
}

/**
 * Runs a server action, shows errors as a toast and then refreshes the given useFetch keys.
 * Returns the result, or `undefined` on error.
 */
export async function runAction<T>(fn: () => Promise<T>, refresh: string[] = []): Promise<T | undefined> {
  try {
    const result = await fn()
    if (refresh.length) await refreshNuxtData(refresh)
    return result
  }
  catch (error) {
    toast.error(apiErrorMessage(error))
    return undefined
  }
}
