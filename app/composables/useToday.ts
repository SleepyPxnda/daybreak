/** The one reactive "today" on the client (Europe/Berlin via the server-hydrated value); `useRefreshOnFocus` moves it to a new day. */
export function useToday() {
  return useState('today', () => today())
}
