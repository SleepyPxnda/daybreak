/** Pastel palette for accounts (tokens `--account-*` in main.css). */
export const ACCOUNT_COLORS = ['lavender', 'peach', 'mint', 'sky', 'rose', 'butter', 'sage', 'lilac'] as const

export type AccountColor = (typeof ACCOUNT_COLORS)[number]

export interface AccountOrderFields {
  id: number
  name: string
  status: 'active' | 'archived'
  sortOrder: number
}

/**
 * The one definition of account order: active before archived.
 * Active accounts by `sortOrder`, then name, then id; archived accounts by name, then id
 * (their `sortOrder` is invisible and stale, so it is ignored).
 */
export function compareAccountOrder(first: AccountOrderFields, second: AccountOrderFields): number {
  if (first.status !== second.status) return first.status === 'active' ? -1 : 1
  if (first.status === 'active' && first.sortOrder !== second.sortOrder) return first.sortOrder - second.sortOrder
  return first.name.localeCompare(second.name, 'de') || first.id - second.id
}
