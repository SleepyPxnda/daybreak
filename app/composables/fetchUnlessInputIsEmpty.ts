type UntypedFetch = (request: string, options: object) => Promise<unknown>

/**
 * Fetcher for `useFetch({ $fetch })` of list endpoints that must not be called without input
 * (an empty `ids` or `q` means "everything"). Returns an empty list without a request instead.
 * The guard lives in the fetcher because refreshNuxtData() refreshes a key regardless of `watch`/`immediate`.
 */
export function fetchUnlessInputIsEmpty(hasInput: () => boolean): typeof $fetch {
  const untypedFetch = $fetch as unknown as UntypedFetch
  const guardedFetch: UntypedFetch = (request, options) => (hasInput() ? untypedFetch(request, options) : Promise.resolve([]))
  return guardedFetch as unknown as typeof $fetch
}
