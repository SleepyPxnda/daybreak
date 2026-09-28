import type { TodoArt } from '#shared/utils/todos'

/** Todo wie ihn GET /api/todos liefert (inkl. Bezug) */
export interface TodoZeile {
  id: number
  art: TodoArt
  text: string
  wer: string | null
  nachfassenAm: string | null
  faelligAm: string | null
  aufgabeId: number | null
  kontoId: number | null
  sortierung: number
  erledigtAm: string | null
  erstelltAm: string
  aufgabeKey: string | null
  aufgabeTitel: string | null
  kontoName: string | null
  kontoFarbe: string | null
}

export function useOffeneTodos() {
  const antwort = useFetch('/api/todos', { key: 'todos-offen', default: () => [] as TodoZeile[] })
  const nachArt = (art: TodoArt) => computed(() => sortiereTodos((antwort.data.value as TodoZeile[]).filter(t => t.art === art), heute()))
  return { ...antwort, nachArt }
}
