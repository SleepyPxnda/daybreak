/** Assignment of a block/template as select value: 'a:12' (task) or 'k:3' (directly on the account). */
export function assignmentValue(z: { taskId?: number | null, accountId?: number | null }): string {
  if (z.taskId) return `a:${z.taskId}`
  if (z.accountId) return `k:${z.accountId}`
  return ''
}

export function assignmentFromValue(value: string): { taskId: number | null, accountId: number | null } {
  const [type, id] = value.split(':')
  const n = Number(id)
  if (type === 'a' && n) return { taskId: n, accountId: null }
  if (type === 'k' && n) return { taskId: null, accountId: n }
  return { taskId: null, accountId: null }
}
