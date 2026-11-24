/** Assignment of a block/template as select value: 'task:12' (task) or 'account:3' (directly on the account). */
export function assignmentValue(assignment: { taskId?: number | null, accountId?: number | null }): string {
  if (assignment.taskId) return `task:${assignment.taskId}`
  if (assignment.accountId) return `account:${assignment.accountId}`
  return ''
}

export function assignmentFromValue(value: string): { taskId: number | null, accountId: number | null } {
  const [type, rawId] = value.split(':')
  const id = Number(rawId)
  if (type === 'task' && id) return { taskId: id, accountId: null }
  if (type === 'account' && id) return { taskId: null, accountId: id }
  return { taskId: null, accountId: null }
}
