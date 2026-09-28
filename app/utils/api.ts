interface ApiOptionen {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | unknown[]
  query?: Record<string, unknown>
}

/**
 * $fetch für Mutationen. Nitros Routen-Typinferenz läuft bei dynamischen URLs in
 * „Excessive stack depth“ – daher bewusst untypisiert; den Antworttyp gibt der Aufrufer an.
 */
export function api<T = unknown>(url: string, optionen?: ApiOptionen): Promise<T> {
  const fetcher = $fetch as unknown as (url: string, optionen?: ApiOptionen) => Promise<T>
  return fetcher(url, optionen)
}
