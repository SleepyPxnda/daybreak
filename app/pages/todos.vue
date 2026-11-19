<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { AlarmClock, ChevronRight, Trash2 } from '@lucide/vue'
import { isDue, TODO_KINDS } from '#shared/utils/todos'
import TodoList from '~/components/todos/TodoList.vue'

useHead({ title: 'Merker & Daily · daybreak' })

const { byKind } = useOpenTodos()
const lists = TODO_KINDS.map(a => ({ ...a, todos: byKind(a.kind) }))
const waitingFor = byKind('waiting_for')
const dueWaitingFor = computed(() => waitingFor.value.filter(t => isDue(t, today())).length)

const Empty: Record<string, string> = {
  reminder: 'Nichts im Kopf behalten – schön.',
  waiting_for: 'Du wartest auf niemanden.',
  daily_topic: 'Nichts fürs nächste Daily.',
}

// Archive of discussed/done items - load only when expanded
const archiveOpen = ref(false)
const { data: done, execute: loadArchive } = useFetch('/api/todos', {
  key: 'todos-done',
  query: { status: 'done' },
  default: () => [],
  immediate: false,
})
watch(archiveOpen, (nowOpen) => {
  if (nowOpen) loadArchive()
})

const kindTitle = (kind: string) => TODO_KINDS.find(a => a.kind === kind)?.singular ?? kind

async function reopen(id: number) {
  await runAction(() => api(`/api/todos/${id}`, { method: 'PATCH', body: { done: false } }), TODO_KEYS)
}

async function remove(id: number) {
  await runAction(() => api(`/api/todos/${id}`, { method: 'DELETE' }), TODO_KEYS)
}
</script>

<template>
  <div class="grid gap-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Merker & Daily
      </h1>
      <p class="text-sm text-muted-foreground">
        Was du im Kopf behalten, von anderen brauchst oder im Daily ansprechen willst.
      </p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-6">
      <Card v-for="l in lists" :key="l.kind" class="gap-0 py-0">
        <CardHeader>
          <CardTitle class="flex items-center justify-between gap-2">
            {{ l.title }}
            <span
              v-if="l.kind === 'waiting_for' && dueWaitingFor"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-warning"
            >
              <AlarmClock class="size-3" />
              <span class="tabular-nums">{{ dueWaitingFor }}</span> nachfassen
            </span>
            <span v-else class="font-mono text-xs font-normal text-muted-foreground">{{ l.todos.value.length }}</span>
          </CardTitle>
        </CardHeader>
        <TodoList :kind="l.kind" :todos="l.todos.value" :empty-text="Empty[l.kind]" />
      </Card>
    </div>

    <Card class="gap-0 py-0">
      <CardHeader :class="{ 'border-b-0': !archiveOpen }" class="p-0">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-sm font-semibold"
          :aria-expanded="archiveOpen"
          @click="archiveOpen = !archiveOpen"
        >
          <span class="inline-flex items-center gap-2">
            <ChevronRight class="size-3.5 text-muted-foreground transition-transform" :class="{ 'rotate-90': archiveOpen }" />
            Besprochen / erledigt
          </span>
          <span v-if="archiveOpen" class="font-mono text-xs font-normal text-muted-foreground">{{ done.length }}</span>
        </button>
      </CardHeader>
      <template v-if="archiveOpen">
        <p v-if="!done.length" class="px-4 py-3 text-sm text-muted-foreground">
          Noch nichts erledigt.
        </p>
        <div
          v-for="t in done"
          :key="t.id"
          class="flex min-h-11 items-center gap-2.5 border-b px-4 py-1.5 text-sm last:border-b-0"
        >
          <span class="inline-flex h-[22px] w-24 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {{ kindTitle(t.kind) }}
          </span>
          <span class="min-w-0 flex-1 truncate text-muted-foreground line-through">
            <template v-if="t.person">{{ t.person }}: </template>{{ t.text }}
          </span>
          <span class="font-mono text-[13px] text-muted-foreground">{{ t.doneAt ? format(new Date(t.doneAt), 'd.M.yyyy', { locale: de }) : '' }}</span>
          <Button variant="ghost" size="sm" class="h-7 text-xs" title="Wieder öffnen" @click="reopen(t.id)">
            Wiederherstellen
          </Button>
          <Button size="icon" variant="ghost" class="size-7" aria-label="Löschen" title="Löschen" @click="remove(t.id)">
            <Trash2 />
          </Button>
        </div>
      </template>
    </Card>
  </div>
</template>
