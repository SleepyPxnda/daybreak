/** Accounts, all tasks and settings - shared (quick input, assignment picker, timeline). */
export function useAccounts() {
  return useFetch('/api/accounts', { key: 'accounts', default: () => [] })
}

export function useAllTasks() {
  return useFetch('/api/tasks', { key: 'tasks', default: () => [] })
}

export function useSettings() {
  return useFetch('/api/settings', { key: 'settings' })
}

/** Reload after changes to accounts/tasks/blocks. */
export const MASTER_DATA_KEYS = ['accounts', 'tasks', 'tasks-in-progress']
