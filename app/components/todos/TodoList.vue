<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { GripVertical, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { parseQuickInput } from '#shared/utils/quickInput'
import type { TodoKind } from '#shared/utils/todos'
import { alterText, isDue, cutoffDate, daysSince } from '#shared/utils/todos'
import type { TodoRow } from '~/composables/useTodos'
import TodoDialog from './TodoDialog.vue'

const props = defineProps<{
  kind: TodoKind
  todos: TodoRow[]
  /** Compact (today page side column): no sorting and no input field */
  compact?: boolean
  emptyText?: string
}>()

const PREFIX: Record<TodoKind, string> = { merker: 't', daily: 'd', warten: 'w' }
const PLACEHOLDERS: Record<TodoKind, string> = {
  merker: 'Merker hinzufügen … (bis fr)',
  warten: 'Tim: PR-Review … (bis fr)',
  daily: 'Daily-Thema hinzufügen …',
}

const todayDate = today()

// --- Drag and drop sorting (local copy for immediate feedback) ---
const list = ref<TodoRow[]>([])
watch(() => props.todos, (next) => { list.value = [...next] }, { immediate: true })
const dragged = ref<number | null>(null)

/** Today page: reminders can be dragged onto the timeline (-> planned 30-minute block) */
const draggableOnTimeline = computed(() => props.compact && props.kind === 'merker')

function dragStart(e: DragEvent, id: number) {
  if (!e.dataTransfer) return
  if (draggableOnTimeline.value) {
    e.dataTransfer.setData(DRAG_REMINDER, String(id))
    e.dataTransfer.effectAllowed = 'copy'
    return
  }
  dragged.value = id
  e.dataTransfer.setData('text/plain', '') // Firefox starts a drag only with data
  e.dataTransfer.effectAllowed = 'move'
}

function dragOver(e: DragEvent, assignmentId: number) {
  if (dragged.value === null || dragged.value === assignmentId) return
  e.preventDefault()
  const from = list.value.findIndex(t => t.id === dragged.value)
  const after = list.value.findIndex(t => t.id === assignmentId)
  if (from < 0 || after < 0) return
  const copy = [...list.value]
  copy.splice(after, 0, copy.splice(from, 1)[0]!)
  list.value = copy
}

async function dragEnd() {
  if (dragged.value === null) return
  dragged.value = null
  const ids = list.value.map(t => t.id)
  if (ids.join() === props.todos.map(t => t.id).join()) return
  await runAction(() => api('/api/todos/reorder', { method: 'POST', body: { ids } }), TODO_KEYS)
}

// --- Actions --------------------------------------------------------------
async function complete(t: TodoRow) {
  const ok = await runAction(() => api(`/api/todos/${t.id}`, { method: 'PATCH', body: { done: true } }), TODO_KEYS)
  if (ok) toast.success(t.kind === 'daily' ? 'Besprochen' : 'Erledigt', {
    action: { label: 'Rückgängig', onClick: () => runAction(() => api(`/api/todos/${t.id}`, { method: 'PATCH', body: { done: false } }), TODO_KEYS) },
  })
}

async function followedUp(t: TodoRow) {
  const result = await runAction(() => api<{ followUpDate: string }>(`/api/todos/${t.id}/followed-up`, { method: 'POST', body: {} }), TODO_KEYS)
  if (result) toast.success(`Nachfassen am ${format(toDate(result.followUpDate), 'EEE d.M.', { locale: de })}`)
}

// Input field uses the same parser as the quick input (who: ..., until fri)
const newText = ref('')
async function add() {
  const r = parseQuickInput(`${PREFIX[props.kind]} ${newText.value}`, { today: todayDate, tasks: [], accounts: [] })
  if (r.type !== 'todo') return
  const ok = await runAction(() => api('/api/todos', {
    method: 'POST',
    body: {
      kind: r.todoKind,
      text: r.text,
      person: r.person ?? null,
      ...(r.todoKind === 'warten' ? { followUpDate: r.cutoffDate ?? null } : {}),
      ...(r.todoKind === 'merker' ? { dueDate: r.cutoffDate ?? null } : {}),
    },
  }), TODO_KEYS)
  if (ok) newText.value = ''
}

const dialog = ref(false)
const edited = ref<TodoRow | null>(null)
function edit(t: TodoRow) {
  edited.value = t
  dialog.value = true
}

function cutoffDateText(t: TodoRow): string | undefined {
  const day = cutoffDate(t)
  if (!day) return undefined
  const text = day === todayDate ? 'heute' : format(toDate(day), 'EEE d.M.', { locale: de })
  return t.kind === 'warten' ? `nachfassen ${text}` : `fällig ${text}`
}
</script>

<template>
  <div class="grid grid-cols-1">
    <p v-if="!list.length && emptyText" class="border-b px-4 py-2.5 text-sm text-muted-foreground last:border-b-0">
      {{ emptyText }}
    </p>
    <div
      v-for="t in list"
      :key="t.id"
      class="group flex min-h-10 items-start gap-2.5 border-b py-2.5 pr-3 text-sm last:border-b-0"
      :class="[
        compact && !draggableOnTimeline ? 'pl-4' : 'pl-2',
        isDue(t, todayDate) ? 'bg-warnung-subtle' : 'hover:bg-raised',
        dragged === t.id && 'opacity-40',
      ]"
      :draggable="!compact || draggableOnTimeline"
      :title="draggableOnTimeline ? 'Auf die Timeline ziehen → 30 min geplant' : undefined"
      @dragstart="dragStart($event, t.id)"
      @dragover="dragOver($event, t.id)"
      @dragend="dragEnd"
      @drop.prevent
    >
      <GripVertical v-if="!compact || draggableOnTimeline" class="mt-0.5 size-4 shrink-0 cursor-grab text-line-strong group-hover:text-muted-foreground" />
      <Checkbox
        class="mt-[3px]"
        :aria-label="kind === 'daily' ? 'Besprochen' : 'Erledigt'"
        :title="kind === 'daily' ? 'Besprochen' : 'Erledigt'"
        @update:model-value="complete(t)"
      />
      <button type="button" class="min-w-0 flex-1 text-left" @click="edit(t)">
        <div class="wrap-anywhere">
          <span v-if="t.person" class="text-muted-foreground">{{ t.person }}: </span>{{ t.text }}
        </div>
        <div
          v-if="kind === 'warten' || cutoffDateText(t) || t.taskTitle || t.accountName"
          class="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground"
        >
          <span v-if="cutoffDateText(t)" :class="{ 'font-medium text-warnung': isDue(t, todayDate) }">{{ cutoffDateText(t) }}</span>
          <span v-if="kind === 'warten'">{{ alterText(daysSince(t.createdAt, todayDate)) }}</span>
          <span v-if="t.taskTitle || t.accountName" class="inline-flex max-w-full min-w-0 items-center gap-1.5" :title="t.taskTitle ?? t.accountName ?? undefined">
            <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(t.accountColor).dot" />
            <TaskKey v-if="t.taskKey" :value="t.taskKey" :color="t.accountColor" />
            <span class="truncate">{{ t.taskTitle ?? t.accountName }}</span>
          </span>
        </div>
      </button>
      <Button
        v-if="kind === 'warten'"
        variant="outline"
        size="sm"
        class="h-7 shrink-0 px-2 text-xs"
        :aria-label="`Nachgefasst (+${FOLLOW_UP_WORKDAYS} Arbeitstage)`"
        :title="`Nachgefasst (+${FOLLOW_UP_WORKDAYS} Arbeitstage)`"
        @click="followedUp(t)"
      >
        Nachgefasst
      </Button>
    </div>

    <form v-if="!compact" class="flex h-11 items-center gap-2 px-4 focus-within:bg-raised" @submit.prevent="add">
      <Plus class="size-3.5 shrink-0 text-muted-foreground" />
      <input
        v-model="newText"
        :placeholder="PLACEHOLDERS[kind]"
        :aria-label="PLACEHOLDERS[kind]"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      >
    </form>

    <TodoDialog v-model:open="dialog" :todo="edited" />
  </div>
</template>
