import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'vue-sonner'
import type { QuickInputBlock, QuickInputNote, QuickInputTodo, QuickInputAssignment } from '#shared/utils/quickInput'
import { parseQuickInput } from '#shared/utils/quickInput'
import { noteKindLabels } from '#shared/utils/notes'
import { TODO_KINDS } from '#shared/utils/todos'

/** useFetch keys of the todo lists */
export const TODO_KEYS = ['todos-open', 'todos-done', 'task-todos']

function dayText(date: string): string {
  if (date === today()) return 'heute'
  if (date === addDays(today(), 1)) return 'morgen'
  if (date === addDays(today(), -1)) return 'gestern'
  return format(toDate(date), 'EEE d. MMM', { locale: de })
}

/**
 * Quick input: parsing, preview and execution - shared by the line on the today page
 * and the Ctrl+K command palette.
 * @param date Day used when the input has no date (the displayed day)
 */
export function useQuickInput(date: MaybeRefOrGetter<string>) {
  const text = ref('')
  const { data: accounts } = useAccounts()
  const { data: tasks } = useAllTasks()

  const result = computed(() => parseQuickInput(text.value, {
    today: today(),
    standardDate: toValue(date),
    tasks: tasks.value,
    accounts: accounts.value,
  }))

  const accountName = (id: number) => accounts.value.find(k => k.id === id)?.name ?? '?'

  function assignmentText(assignment: QuickInputAssignment): string {
    if (assignment.type === 'account') return accountName(assignment.accountId)
    if (assignment.type === 'newTask') return `neue Aufgabe „${assignment.title}“ in ${accountName(assignment.accountId)}`
    const task = tasks.value.find(entry => entry.id === assignment.taskId)
    return task ? `${task.key ? `${task.key} ` : ''}${task.title} (${accountName(task.accountId)})` : '?'
  }

  function blockPreview(b: QuickInputBlock): string {
    const time = 'duration' in b.time ? formatDuration(b.time.duration) : `${formatTime(b.time.start)}–${formatTime(b.time.end)}`
    return [
      b.status === 'planned' ? 'Planen' : 'Buchen',
      dayText(b.date),
      time,
      b.kind === 'break' ? 'Pause' : b.assignment ? assignmentText(b.assignment) : undefined,
    ].filter(Boolean).join(' · ')
  }

  function todoPreview(t: QuickInputTodo): string {
    const kind = TODO_KINDS.find(a => a.kind === t.todoKind)!.singular
    const split = [kind, t.person ? `${t.person}: ${t.text}` : t.text]
    if (t.cutoffDate) split.push(`${t.todoKind === 'waiting_for' ? 'nachfassen' : 'fällig'} ${dayText(t.cutoffDate)}`)
    return split.join(' · ')
  }

  function notePreview(note: QuickInputNote): string {
    const kind = note.kind ? noteKindLabels(note.kind).singular : undefined
    const linkedTask = note.taskId ? tasks.value.find(entry => entry.id === note.taskId) : undefined
    const taskText = linkedTask ? ` (${linkedTask.key ? `${linkedTask.key} ` : ''}${linkedTask.title})` : ''
    return `Neue ${kind ? `${kind}-Notiz` : 'Notiz'} · ${note.title}${taskText} – öffnet den Editor`
  }

  /** One-line description of what Enter would do (null = nothing to run) */
  const preview = computed(() => {
    const r = result.value
    if (r.type === 'block') return { text: blockPreview(r), note: r.note }
    if (r.type === 'todo') return { text: todoPreview(r), note: undefined }
    if (r.type === 'note') return { text: notePreview(r), note: undefined }
    return null
  })

  const running = ref(false)

  async function blockCreate(r: QuickInputBlock, assignment: QuickInputAssignment | undefined): Promise<boolean> {
    let ids: { taskId: number | null, accountId: number | null } = { taskId: null, accountId: null }
    if (assignment?.type === 'newTask') {
      const createdTask = await runAction(() => api<{ id: number }>('/api/tasks', { method: 'POST', body: { accountId: assignment.accountId, title: assignment.title } }))
      if (!createdTask) return false
      ids = { taskId: createdTask.id, accountId: null }
    }
    else if (assignment?.type === 'task') ids = { taskId: assignment.taskId, accountId: null }
    else if (assignment?.type === 'account') ids = { taskId: null, accountId: assignment.accountId }

    const ok = await runAction(() => api('/api/blocks', {
      method: 'POST',
      body: { date: r.date, kind: r.kind, status: r.status, ...r.time, ...ids, note: r.note ?? null },
    }), [...DAY_KEYS, ...MASTER_DATA_KEYS])
    if (ok) toast.success(blockPreview({ ...r, assignment }))
    return !!ok
  }

  async function todoCreate(t: QuickInputTodo): Promise<boolean> {
    const ok = await runAction(() => api('/api/todos', {
      method: 'POST',
      body: {
        kind: t.todoKind,
        text: t.text,
        person: t.person ?? null,
        ...(t.todoKind === 'waiting_for' ? { followUpDate: t.cutoffDate ?? null } : {}),
        ...(t.todoKind === 'reminder' ? { dueDate: t.cutoffDate ?? null } : {}),
      },
    }), TODO_KEYS)
    if (ok) toast.success(`${todoPreview(t)} – gespeichert`)
    return !!ok
  }

  /**
   * Runs the current result. Returns true if something was created (input is cleared).
   * `selected` = choice when the assignment is ambiguous.
   */
  async function run(selected?: QuickInputAssignment): Promise<boolean> {
    const r = result.value
    if (r.type === 'error') {
      toast.error(r.message)
      return false
    }
    if (r.type !== 'block' && r.type !== 'todo' && r.type !== 'note') return false
    const assignment = r.type === 'block' ? selected ?? r.assignment : undefined
    if (r.type === 'block' && r.kind === 'work' && !assignment) return false // candidates are shown

    running.value = true
    try {
      const ok = r.type === 'block'
        ? await blockCreate(r, assignment)
        : r.type === 'todo' ? await todoCreate(r) : await newNote(r.title, { kind: r.kind, taskId: r.taskId })
      if (ok) text.value = ''
      return ok
    }
    finally {
      running.value = false
    }
  }

  return { text, result, preview, assignmentText, running, run }
}
