interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | unknown[]
  query?: Record<string, unknown>
}

/**
 * $fetch for mutations. Nitro's route type inference hits
 * "Excessive stack depth" with dynamic URLs - so it is deliberately untyped; the caller provides the response type.
 */
export function api<T = unknown>(url: string, options?: ApiOptions): Promise<T> {
  const fetcher = $fetch as unknown as (url: string, options?: ApiOptions) => Promise<T>
  return fetcher(url, options)
}
