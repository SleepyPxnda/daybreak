<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, CheckCircle2, Circle, CircleCheck, CircleDot, Pencil, RotateCcw, Trash2 } from '@lucide/vue'
import TaskNotes from '~/components/notes/TaskNotes.vue'
import { TODO_KINDS } from '#shared/utils/todos'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const { data: task, error } = await useFetch(() => `/api/tasks/${id.value}`, { key: 'task-detail' })
// Linked reminders (open entries of all kinds referring to this task)
const { data: todos } = useFetch('/api/todos', { key: 'task-todos', query: { taskId: id }, default: () => [] })
const { data: notes } = useFetch('/api/notes', { key: 'task-notes', query: { taskId: id, includeContent: '1' }, default: () => [] })
// Other notes whose text references this task's key
const { data: mentioningNotes } = useFetch('/api/notes', { key: 'task-note-mentions', query: { mentionsTaskId: id, includeContent: '1' }, default: () => [] })

useHead({ title: () => `${task.value?.key ? `${task.value.key} ` : ''}${task.value?.title ?? 'Aufgabe'} · daybreak` })

const edit = ref(false)
const deleteQuestion = ref(false)

const days = computed(() => {
  const groups = new Map<string, NonNullable<typeof task.value>['blocks']>()
  for (const b of task.value?.blocks ?? []) {
    const list = groups.get(b.date) ?? []
    list.push(b)
    groups.set(b.date, list)
  }
  return [...groups.entries()].reverse().map(([date, blocks]) => ({
    date,
    blocks,
    booked: actualMinutes(blocks),
    planned: plannedMinutes(blocks),
  }))
})

const progress = computed(() => {
  const currentTask = task.value
  if (!currentTask?.estimateMin) return undefined
  return Math.min(100, Math.round((currentTask.bookedMin / currentTask.estimateMin) * 100))
})

// Display status as on the account page: "in progress" = open and time already booked
const statusDisplay = computed(() => {
  if (task.value?.status === 'closed') return { text: 'Abgeschlossen', icon: CircleCheck, cssClass: 'text-positive' }
  if (task.value?.bookedMin) return { text: 'In Arbeit', icon: CircleDot, cssClass: 'text-info' }
  return { text: 'Offen', icon: Circle, cssClass: 'text-muted-foreground' }
})

async function statusToggle() {
  const status = task.value?.status === 'open' ? 'closed' : 'open'
  await runAction(() => api(`/api/tasks/${id.value}`, { method: 'PATCH', body: { status } }), ['task-detail', ...MASTER_DATA_KEYS])
}

async function remove() {
  const ok = await runAction(() => api(`/api/tasks/${id.value}`, { method: 'DELETE' }), MASTER_DATA_KEYS)
  if (ok) await navigateTo(`/accounts?accountId=${task.value?.accountId}`)
}

const formatDay = (date: string) => format(toDate(date), 'EEEE, d. MMMM yyyy', { locale: de })
</script>

<template>
  <div v-if="error" class="text-sm text-muted-foreground">
    Aufgabe nicht gefunden – vielleicht hat sie sich schon verzogen.
  </div>
  <div v-else-if="task" class="grid max-w-4xl gap-6">
    <div>
      <NuxtLink :to="`/accounts?accountId=${task.accountId}`" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft class="size-4" /> {{ task.account.name }}
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1 basis-80 space-y-1.5">
        <div class="flex items-center gap-2.5">
          <span class="size-3 shrink-0 rounded-full" :class="accountColorClasses(task.account.color).dot" />
          <TaskKey v-if="task.key" :value="task.key" :color="task.account.color" />
          <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="statusDisplay.cssClass">
            <component :is="statusDisplay.icon" class="size-3.5" />
            {{ statusDisplay.text }}
          </span>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight wrap-anywhere">
          {{ task.title }}
        </h1>
      </div>
      <div class="flex shrink-0 gap-2">
        <Button v-if="!task.blocks.length" variant="ghost" size="icon" aria-label="Löschen" title="Löschen" @click="deleteQuestion = true">
          <Trash2 />
        </Button>
        <Button variant="outline" @click="edit = true">
          <Pencil /> Bearbeiten
        </Button>
        <Button v-if="task.status === 'open'" @click="statusToggle">
          <CheckCircle2 /> Abschließen
        </Button>
        <Button v-else variant="outline" @click="statusToggle">
          <RotateCcw /> Wieder öffnen
        </Button>
      </div>
    </div>

    <div class="grid gap-2">
      <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Gebucht
          </div>
          <div class="font-mono text-2xl font-medium" :class="{ 'text-negative': task.estimateMin && task.bookedMin > task.estimateMin }">
            {{ formatDuration(task.bookedMin) }}
          </div>
        </div>
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Geplant
          </div>
          <div class="font-mono text-2xl font-medium">
            {{ formatDuration(task.plannedMin) }}
          </div>
        </div>
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Schätzung
          </div>
          <div class="font-mono text-2xl font-medium text-muted-foreground">
            {{ task.estimateMin ? formatDuration(task.estimateMin) : '–' }}
          </div>
        </div>
      </div>
      <div
        v-if="progress !== undefined"
        class="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Gebucht von Schätzung"
      >
        <div class="h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <TaskNotes :task-id="task.id" :task-title="task.title" :notes="notes" :mentioning-notes="mentioningNotes" />

    <Card v-if="todos.length" class="gap-0 py-0">
      <CardHeader>
        <CardTitle class="flex items-center justify-between gap-2">
          Merker
          <span class="font-mono text-xs font-normal text-muted-foreground">{{ todos.length }}</span>
        </CardTitle>
      </CardHeader>
      <NuxtLink
        v-for="t in todos"
        :key="t.id"
        to="/todos"
        class="flex min-h-10 items-center gap-2.5 border-b px-4 py-1.5 text-sm last:border-b-0 hover:bg-raised"
      >
        <span class="inline-flex h-[22px] w-24 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {{ TODO_KINDS.find(a => a.kind === t.kind)?.singular }}
        </span>
        <span class="min-w-0 wrap-anywhere"><span v-if="t.person" class="text-muted-foreground">{{ t.person }}: </span>{{ t.text }}</span>
      </NuxtLink>
    </Card>

    <Card class="gap-0 py-0">
      <CardHeader>
        <CardTitle>Blöcke</CardTitle>
      </CardHeader>
      <p v-if="!days.length" class="px-4 py-3 text-sm text-muted-foreground">
        Noch keine Blöcke – der Kalender ist hier noch wolkenlos.
      </p>
      <div v-for="t in days" :key="t.date" class="grid gap-1 border-b px-4 py-3 last:border-b-0">
        <div class="flex items-baseline justify-between gap-4 text-sm">
          <NuxtLink :to="`/?date=${t.date}`" class="font-medium hover:underline">
            {{ formatDay(t.date) }}
          </NuxtLink>
          <span class="font-mono text-[13px] text-muted-foreground">
            {{ formatDuration(t.booked) }}<template v-if="t.planned"> · geplant {{ formatDuration(t.planned) }}</template>
          </span>
        </div>
        <div v-for="b in t.blocks" :key="b.id" class="flex gap-3 text-sm text-muted-foreground">
          <span class="font-mono text-[13px]">{{ formatTime(b.start) }}–{{ formatTime(b.end) }}</span>
          <span v-if="b.status === 'planned'" class="italic">geplant</span>
          <span v-if="b.note" class="text-foreground">{{ b.note }}</span>
        </div>
      </div>
    </Card>

    <TaskDialog v-model:open="edit" :task="task" />
    <AlertDialog v-model:open="deleteQuestion">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{{ task.title }}“ hat keine Blöcke und wird endgültig gelöscht.<template v-if="notes.length"> Verknüpfte Notizen bleiben am Konto erhalten.</template></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="remove">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
