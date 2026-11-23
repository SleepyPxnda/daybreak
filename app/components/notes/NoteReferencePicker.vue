<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { ListboxFilter } from 'reka-ui'
import { Search } from '@lucide/vue'
import { noteReferenceText, normalizeTaskKey } from '#shared/utils/notes'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

// "Verweis einfügen": search over notes and open tasks with a key; emits the reference text to insert
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ currentNoteId: number }>()
const emit = defineEmits<{ select: [referenceText: string] }>()

const MAX_RESULTS_PER_GROUP = 8

const searchText = ref('')
const trimmedSearch = computed(() => searchText.value.trim().slice(0, 100))
const debouncedSearch = refDebounced(trimmedSearch, 250)

watch(open, (isOpen) => {
  if (!isOpen) searchText.value = ''
})

// Notes: server search; no request while the search text is empty.
// The guard sits in the fetcher: refreshNuxtData() refreshes this key regardless of the watch options.
const { data: foundNotes, status: noteSearchStatus } = useFetch('/api/notes', {
  key: 'note-reference-search',
  query: { q: debouncedSearch },
  $fetch: fetchUnlessInputIsEmpty(() => !!debouncedSearch.value),
  default: () => [],
})

// Tasks: from the already loaded master data; only open tasks with a usable key of an active account
const { data: tasks } = useAllTasks()
const { data: accounts } = useAccounts()

const noteResults = computed(() => (debouncedSearch.value
  ? foundNotes.value.filter(entry => entry.id !== props.currentNoteId).slice(0, MAX_RESULTS_PER_GROUP)
  : []))

const taskResults = computed(() => {
  const search = normalizeTaskKey(trimmedSearch.value)
  if (!search) return []
  return tasks.value
    .filter(entry => entry.status === 'open' && entry.key && !/[[\]]/.test(entry.key))
    .flatMap((entry) => {
      const owner = accounts.value.find(candidate => candidate.id === entry.accountId)
      return owner?.status === 'active' && (normalizeTaskKey(entry.key!).includes(search) || normalizeTaskKey(entry.title).includes(search))
        ? [{ id: entry.id, key: entry.key!, title: entry.title, color: owner.color }]
        : []
    })
    .slice(0, MAX_RESULTS_PER_GROUP)
})

// The search is settled when the debounce caught up and the note search is not running
const isSettled = computed(() => debouncedSearch.value === trimmedSearch.value && noteSearchStatus.value !== 'pending')
const hasQuery = computed(() => !!trimmedSearch.value)
const hasNothingFound = computed(() => hasQuery.value && isSettled.value && !noteResults.value.length && !taskResults.value.length)

function choose(referenceText: string) {
  emit('select', referenceText)
  open.value = false
}
</script>

<template>
  <CommandDialog v-model:open="open" title="Verweis einfügen" description="Notiz oder Aufgabe suchen und als Verweis einfügen">
    <div class="p-1 pb-0">
      <div class="flex h-9 items-center gap-2 rounded-md border border-input bg-raised px-2.5">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <ListboxFilter
          v-model="searchText"
          auto-focus
          placeholder="Notiz oder Aufgabe suchen …"
          class="w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
        />
      </div>
    </div>

    <CommandList class="max-h-80">
      <p v-if="!hasQuery" class="px-3 py-6 text-center text-sm text-muted-foreground">
        Tippe, um Notizen und Aufgaben zu finden.
      </p>
      <p v-else-if="hasNothingFound" class="px-3 py-6 text-center text-sm text-muted-foreground">
        Nichts gefunden.
      </p>
      <CommandGroup v-if="noteResults.length" heading="Notizen">
        <CommandItem v-for="entry in noteResults" :key="`note-${entry.id}`" :value="`note-${entry.id}`" :title="entry.title" @select="choose(noteReferenceText(entry))">
          <NoteKindMarker v-if="entry.kind" :kind="entry.kind" />
          <span v-else class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="fade-end min-w-0 flex-1">{{ entry.title }}</span>
        </CommandItem>
      </CommandGroup>
      <CommandGroup v-if="taskResults.length" heading="Aufgaben">
        <CommandItem v-for="entry in taskResults" :key="`task-${entry.id}`" :value="`task-${entry.id}`" :title="entry.title" @select="choose(`[[${entry.key}]]`)">
          <TaskKey :value="entry.key" :color="entry.color" />
          <span class="fade-end min-w-0 flex-1">{{ entry.title }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>

    <div class="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
      <template v-if="!hasNothingFound">
        <span class="inline-flex items-center gap-1"><kbd class="rounded-sm bg-muted px-1 font-mono text-[11px]">↑ ↓</kbd> wählen</span>
        <span class="inline-flex items-center gap-1"><kbd class="rounded-sm bg-muted px-1 font-mono text-[11px]">Enter</kbd> einfügen</span>
      </template>
      <span class="inline-flex items-center gap-1"><kbd class="rounded-sm bg-muted px-1 font-mono text-[11px]">Esc</kbd> schließen</span>
    </div>
  </CommandDialog>
</template>
