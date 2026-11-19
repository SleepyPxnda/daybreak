import type { TimeRange } from '#shared/utils/blocks'
import type { BlockDraft } from '~/components/timeline/BlockDialog.vue'
import type { TemplateForm } from '~/components/TemplateDialog.vue'
import type { TimelineBlock } from '~/utils/timeline'

export type BlockMenuAction = 'toggle' | 'split' | 'delete' | 'edit' | 'recurring'

/**
 * Timeline actions for today and week: create, change, menu, drop of tasks/reminders.
 * Also provides the state for BlockDialog and TemplateDialog, which the page renders.
 */
export function useBlockEditing() {
  const currentMinute = useCurrentMinute()
  const { data: openTodos } = useOpenTodos()

  const blockDialog = ref(false)
  const editedBlock = ref<TimelineBlock | null>(null)
  const draft = ref<BlockDraft | null>(null)
  const templateDialog = ref(false)
  const templateDraft = ref<TemplateForm | null>(null)

  /** New block: past time is booked, future time is planned */
  function standardStatus(date: string, end: number) {
    if (date < today()) return 'gebucht' as const
    if (date > today()) return 'geplant' as const
    return end <= (currentMinute.value ?? 0) ? 'gebucht' as const : 'geplant' as const
  }

  function draftOpen(e: BlockDraft) {
    editedBlock.value = null
    draft.value = e
    blockDialog.value = true
  }

  function create(date: string, z: TimeRange) {
    draftOpen({ date, ...z, status: standardStatus(date, z.end) })
  }

  function open(b: TimelineBlock) {
    draft.value = null
    editedBlock.value = b
    blockDialog.value = true
  }

  async function change(id: number, z: TimeRange) {
    await runAction(() => api(`/api/blocks/${id}`, { method: 'PATCH', body: { ...z } }), DAY_KEYS)
  }

  async function menu(actionName: BlockMenuAction, b: TimelineBlock, minute: number) {
    switch (actionName) {
      case 'toggle':
        await runAction(() => api(`/api/blocks/${b.id}`, { method: 'PATCH', body: { status: b.status === 'geplant' ? 'gebucht' : 'geplant' } }), DAY_KEYS)
        break
      case 'split': {
        const at = minute > b.start && minute < b.end ? minute : snapToGrid((b.start + b.end) / 2)
        await runAction(() => api(`/api/blocks/${b.id}/split`, { method: 'POST', body: { at } }), DAY_KEYS)
        break
      }
      case 'delete':
        await runAction(() => api(`/api/blocks/${b.id}`, { method: 'DELETE' }), DAY_KEYS)
        break
      case 'edit':
        open(b)
        break
      case 'recurring':
        templateDraft.value = {
          name: null,
          taskId: b.taskId,
          accountId: b.accountId,
          start: b.start,
          end: b.end,
          weekdays: [weekday(b.date)],
          intervalWeeks: 1,
          validFrom: b.date,
          validUntil: null,
          fromBlockId: b.id,
        }
        templateDialog.value = true
        break
    }
  }

  /** Drop from the tasks-in-progress card: 1 h block starting at the drop position */
  async function drop(date: string, taskId: number, start: number) {
    const end = Math.min(start + 60, DAY_MIN)
    await runAction(() => api('/api/blocks', {
      method: 'POST',
      body: { date, kind: 'arbeit', status: standardStatus(date, end), start, end, taskId },
    }), DAY_KEYS)
  }

  /** Drop of a reminder: 30 min planned, text as note; without reference, pick the assignment in the dialog */
  async function dropReminder(date: string, todoId: number, start: number) {
    const reminder = openTodos.value.find(t => t.id === todoId)
    if (!reminder) return
    const end = Math.min(start + 30, DAY_MIN)
    if (!reminder.taskId && !reminder.accountId) {
      draftOpen({ date, start, end, status: 'geplant', note: reminder.text })
      return
    }
    await runAction(() => api('/api/blocks', {
      method: 'POST',
      body: {
        date,
        kind: 'arbeit',
        status: 'geplant',
        start,
        end,
        ...(reminder.taskId ? { taskId: reminder.taskId } : { accountId: reminder.accountId }),
        note: reminder.text,
      },
    }), DAY_KEYS)
  }

  return {
    currentMinute,
    blockDialog,
    editedBlock,
    draft,
    templateDialog,
    templateDraft,
    create,
    open,
    change,
    menu,
    drop,
    dropReminder,
  }
}
