/** useFetch keys around notes */
export const NOTE_KEYS = ['notes-list', 'notes-tags', 'notes-pinned', 'task-notes']

/** Create a new note and open it in the editor; `listQuery` (`tag`, `kind`) is kept in the URL */
export async function newNote(title = 'Neue Notiz', extra: Record<string, unknown> = {}, listQuery: Record<string, string | undefined> = {}): Promise<boolean> {
  const createdNote = await runAction(() => api<{ id: number }>('/api/notes', { method: 'POST', body: { title, ...extra } }), NOTE_KEYS)
  if (!createdNote) return false
  await navigateTo({ path: '/notes', query: { ...listQuery, id: createdNote.id } })
  return true
}
