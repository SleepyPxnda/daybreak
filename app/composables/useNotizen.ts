/** useFetch-Keys rund um Notizen */
export const NOTIZ_KEYS = ['notizen-liste', 'notizen-tags', 'notizen-angepinnt', 'aufgabe-notizen']

/** Neue Notiz anlegen und im Editor öffnen */
export async function neueNotiz(titel = 'Neue Notiz', extra: Record<string, unknown> = {}): Promise<boolean> {
  const neu = await aktion(() => api<{ id: number }>('/api/notizen', { method: 'POST', body: { titel, ...extra } }), NOTIZ_KEYS)
  if (!neu) return false
  await navigateTo({ path: '/notizen', query: { id: neu.id } })
  return true
}
