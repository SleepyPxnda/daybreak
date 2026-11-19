import type { TodoKind } from '#shared/utils/todos'

/** Todo as returned by GET /api/todos (incl. reference) */
export interface TodoRow {
  id: number
  kind: TodoKind
  text: string
  person: string | null
  followUpDate: string | null
  dueDate: string | null
  taskId: number | null
  accountId: number | null
  sortOrder: number
  doneAt: string | null
  createdAt: string
  taskKey: string | null
  taskTitle: string | null
  accountName: string | null
  accountColor: string | null
}

export function useOpenTodos() {
  const response = useFetch('/api/todos', { key: 'todos-open', default: () => [] as TodoRow[] })
  const byKind = (kind: TodoKind) => computed(() => sortTodos((response.data.value as TodoRow[]).filter(t => t.kind === kind), today()))
  return { ...response, byKind }
}
