<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { ListboxFilter } from 'reka-ui'
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CornerDownLeft,
  FolderKanban,
  Hourglass,
  ListTodo,
  MessageSquare,
  NotebookPen,
  Pin,
  Search,
  Settings,
  StickyNote,
  Sunrise,
} from '@lucide/vue'
import type { TodoKind } from '#shared/utils/todos'

// Global command palette: Ctrl/Cmd + K from any page - quick input, search, navigation.
// Filters by itself (ListboxFilter instead of CommandInput) so action and search results are not filtered away.

const open = usePaletteOpen()
const route = useRoute()
const todayDate = useToday()

/** On the today page the displayed day applies, otherwise today */
const date = computed(() => {
  const d = String(route.query.date ?? '')
  return route.path === '/' && isIsoDate(d) ? d : todayDate.value
})

const { text, result, preview, assignmentText, running, run } = useQuickInput(date)

useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
})

watch(open, (nowOpen) => {
  if (!nowOpen) text.value = ''
})

// --- Search ----------------------------------------------------------------
interface SearchResult {
  tasks: { id: number, key: string | null, title: string, status: string, accountColor: string }[]
  accounts: { id: number, name: string, color: string, status: string }[]
  notes: { id: number, title: string, pinned: boolean }[]
  todos: { id: number, kind: TodoKind, text: string, person: string | null }[]
}
const hit = ref<SearchResult | null>(null)
const searchText = computed(() => (result.value.type === 'search' ? result.value.text : ''))

const search = useDebounceFn(async (q: string) => {
  if (q.length < 2) {
    hit.value = null
    return
  }
  try {
    const response = await api<SearchResult>('/api/search', { query: { q } })
    if (q === searchText.value) hit.value = response
  }
  catch {
    hit.value = null
  }
}, 150)
watch(searchText, q => search(q))

// --- Navigation -----------------------------------------------------------
const PAGES = [
  { title: 'Heute', to: '/', icon: Sunrise },
  { title: 'Woche', to: '/week', icon: CalendarRange },
  { title: 'Übersicht', to: '/overview', icon: BarChart3 },
  { title: 'Kalender', to: '/calendar', icon: CalendarDays },
  { title: 'Merker & Daily', to: '/todos', icon: ListTodo },
  { title: 'Notizen', to: '/notes', icon: NotebookPen },
  { title: 'Konten & Aufgaben', to: '/accounts', icon: FolderKanban },
  { title: 'Einstellungen', to: '/settings', icon: Settings },
]
const pages = computed(() => {
  const q = text.value.trim().toLocaleLowerCase('de')
  if (!q) return PAGES
  if (result.value.type !== 'search') return []
  return PAGES.filter(s => s.title.toLocaleLowerCase('de').includes(q))
})

const TODO_ICONS: Record<TodoKind, typeof StickyNote> = { reminder: StickyNote, waiting_for: Hourglass, daily_topic: MessageSquare }

async function openPage(to: string) {
  open.value = false
  await navigateTo(to)
}

async function runAndClose(selected?: Parameters<typeof run>[0]) {
  if (await run(selected)) open.value = false
}

/**
 * Enter always runs an unambiguous action (booking/reminder ...) directly, regardless of which
 * entry is currently highlighted (e.g. after pasting with Ctrl+V). For candidates/search the list navigates.
 */
function interceptEnter(e: KeyboardEvent) {
  const r = result.value
  const unique = r.type === 'todo' || r.type === 'note' || r.type === 'error' || (r.type === 'block' && !r.candidates)
  if (!unique) return
  e.preventDefault()
  e.stopPropagation()
  runAndClose()
}
</script>

<template>
  <CommandDialog v-model:open="open" title="Befehlspalette" description="Buchen, Merker erfassen, suchen und navigieren">
    <div class="p-1 pb-0" @keydown.enter.capture="interceptEnter">
      <div class="flex h-9 items-center gap-2 rounded-md border border-input bg-raised px-2.5">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <ListboxFilter
          v-model="text"
          auto-focus
          :disabled="running"
          placeholder="t Merker · d Daily-Thema · w Tim: PR-Review · n Notiz · 2h Aufgabe · suchen …"
          class="w-full bg-transparent font-mono text-sm outline-hidden placeholder:text-muted-foreground"
        />
      </div>
    </div>

    <CommandList class="max-h-96">
      <!-- Action from the quick input -->
      <p v-if="result.type === 'error'" class="px-3 py-2 text-sm text-destructive">
        {{ result.message }}
      </p>
      <CommandGroup v-else-if="preview" heading="Ausführen">
        <template v-if="result.type === 'block' && result.candidates">
          <CommandItem
            v-for="(candidate, index) in result.candidates"
            :key="`candidate-${index}`"
            :value="`candidate-${index}`"
            @select="runAndClose(candidate)"
          >
            <CornerDownLeft /> <span class="min-w-0 truncate">{{ preview.text }} · {{ assignmentText(candidate) }}</span>
          </CommandItem>
        </template>
        <CommandItem v-else value="run" @select="runAndClose()">
          <CornerDownLeft />
          <span class="min-w-0 truncate">{{ preview.text }}<span v-if="preview.note" class="text-muted-foreground"> · „{{ preview.note }}“</span></span>
        </CommandItem>
      </CommandGroup>

      <!-- Search results -->
      <template v-if="result.type === 'search' && hit">
        <CommandGroup v-if="hit.tasks.length" heading="Aufgaben">
          <CommandItem v-for="task in hit.tasks" :key="`task-${task.id}`" :value="`task-${task.id}`" @select="openPage(`/tasks/${task.id}`)">
            <span class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(task.accountColor).dot" />
            <TaskKey v-if="task.key" :value="task.key" :color="task.accountColor" />
            <span class="min-w-0 truncate" :class="{ 'text-muted-foreground': task.status !== 'open' }">{{ task.title }}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup v-if="hit.accounts.length" heading="Konten">
          <CommandItem v-for="account in hit.accounts" :key="`account-${account.id}`" :value="`account-${account.id}`" @select="openPage(`/accounts?accountId=${account.id}`)">
            <span class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(account.color).dot" />
            <span class="min-w-0 truncate" :class="{ 'text-muted-foreground': account.status !== 'active' }">{{ account.name }}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup v-if="hit.notes.length" heading="Notizen">
          <CommandItem v-for="note in hit.notes" :key="`note-${note.id}`" :value="`note-${note.id}`" @select="openPage(`/notes?id=${note.id}`)">
            <component :is="note.pinned ? Pin : NotebookPen" />
            <span class="truncate">{{ note.title }}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup v-if="hit.todos.length" heading="Merker & Daily">
          <CommandItem v-for="t in hit.todos" :key="`todo-${t.id}`" :value="`todo-${t.id}`" @select="openPage('/todos')">
            <component :is="TODO_ICONS[t.kind]" />
            <span v-if="t.person" class="text-muted-foreground">{{ t.person }}:</span>
            <span class="truncate">{{ t.text }}</span>
          </CommandItem>
        </CommandGroup>
        <p
          v-if="!hit.tasks.length && !hit.accounts.length && !hit.notes.length && !hit.todos.length && !pages.length"
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          Nichts gefunden.
        </p>
      </template>

      <!-- Navigation -->
      <CommandGroup v-if="pages.length" heading="Gehe zu">
        <CommandItem v-for="s in pages" :key="s.to" :value="`page-${s.to}`" @select="openPage(s.to)">
          <component :is="s.icon" /> {{ s.title }}
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
