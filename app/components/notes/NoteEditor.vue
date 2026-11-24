<script setup lang="ts">
import { format } from 'date-fns'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Check, CircleAlert, ExternalLink, Pin, Trash2, X } from '@lucide/vue'
import { NOTE_KINDS, noteKindLabels, normalizeTags, parseNoteReferences } from '#shared/utils/notes'
import { normalizeForComparison } from '#shared/utils/text'
import type { NoteKind } from '#shared/utils/notes'
import NoteReferencePicker from '~/components/notes/NoteReferencePicker.vue'
import NoteReferences from '~/components/notes/NoteReferences.vue'
import type { ResolvedNoteReference } from '~/components/notes/NoteReferences.vue'

interface Note {
  id: number
  title: string
  content: string
  kind: NoteKind | null
  tags: string[]
  taskId: number | null
  accountId: number | null
  pinned: boolean
  updatedAt: string
}

// Plain text editor with autosave
const props = defineProps<{ id: number, listQuery: Record<string, string | undefined> }>()

const form = reactive<{ title: string, content: string, kind: NoteKind | null, tagsText: string, assignment: string, pinned: boolean }>({ title: '', content: '', kind: null, tagsText: '', assignment: '', pinned: false })
const loaded = ref(false)
const notFound = ref(false)
const status = ref<'saved' | 'changed' | 'saving' | 'error'>('saved')
const savedAt = ref<string>()

/** Last saved state of the note that `savedState` refers to */
let currentId = 0
let savedState = ''

function payload() {
  return {
    title: form.title.trim() || 'Ohne Titel',
    content: form.content,
    kind: form.kind,
    tags: normalizeTags(form.tagsText),
    ...assignmentFromValue(form.assignment),
    pinned: form.pinned,
  }
}

const isChanged = () => loaded.value && JSON.stringify(payload()) !== savedState

async function save() {
  if (!isChanged()) return
  const id = currentId
  const data = payload()
  const state = JSON.stringify(data)
  status.value = 'saving'
  const ok = await runAction(() => api<Note>(`/api/notes/${id}`, { method: 'PATCH', body: data }), NOTE_KEYS)
  if (id !== currentId) return // another note was opened in the meantime
  if (ok) {
    savedState = state
    savedAt.value = format(new Date(), 'HH:mm')
    status.value = isChanged() ? 'changed' : 'saved'
  }
  else {
    status.value = 'error'
  }
}

const saveDebounced = useDebounceFn(save, 800)

watch(form, () => {
  if (!isChanged()) return
  status.value = 'changed'
  saveDebounced()
}, { deep: true })

async function load(id: number) {
  loaded.value = false
  notFound.value = false
  try {
    const loadedNote = await api<Note>(`/api/notes/${id}`)
    if (id !== props.id) return // a late response for a note that is no longer selected
    currentId = id
    form.title = loadedNote.title
    form.content = loadedNote.content
    form.kind = loadedNote.kind
    form.tagsText = loadedNote.tags.map(tag => `#${tag}`).join(' ')
    form.assignment = assignmentValue(loadedNote)
    form.pinned = loadedNote.pinned
    referenceContent.value = loadedNote.content
    savedState = JSON.stringify(payload())
    savedAt.value = format(new Date(loadedNote.updatedAt), 'dd.MM. HH:mm')
    status.value = 'saved'
    loaded.value = true
  }
  catch {
    if (id === props.id) notFound.value = true
  }
}

// When switching notes, first save pending changes of the old one
watch(() => props.id, async (newId, previousId) => {
  if (previousId !== undefined) await save()
  await load(newId)
}, { immediate: true })

onBeforeUnmount(() => {
  save()
})

// Ctrl+S saves immediately
useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'saving': return 'Speichert …'
    case 'changed': return 'Ungespeichert'
    case 'error': return 'Speichern fehlgeschlagen'
    default: return savedAt.value ? `Gespeichert · ${savedAt.value}` : 'Gespeichert'
  }
})

const linkedTaskId = computed(() => assignmentFromValue(form.assignment).taskId)

// The title is one line: Enter adds no line break and pasted line breaks become spaces
watch(() => form.title, (title) => {
  const oneLine = title.replace(/\s*[\r\n]+\s*/g, ' ')
  if (oneLine !== title) form.title = oneLine
})

// --- References -------------------------------------------------------------
// Parsed from the text while typing (debounced), not from the saved note
const referenceContent = ref('')
const updateReferenceContent = useDebounceFn((content: string) => {
  referenceContent.value = content
}, 250)
watch(() => form.content, content => updateReferenceContent(content))

const references = computed(() => parseNoteReferences(referenceContent.value))
const MAX_NOTE_IDS_PER_REQUEST = 50
const referencedNoteIdsText = computed(() => references.value
  .flatMap(reference => (reference.type === 'note' && reference.noteId !== props.id ? [reference.noteId] : []))
  .slice(0, MAX_NOTE_IDS_PER_REQUEST)
  .join(','))

// No request while the text has no note references (an empty `ids` would mean "all notes").
// The guard sits in the fetcher: refreshNuxtData() refreshes this key regardless of the watch options.
const { data: referencedNotes, status: referencedNotesStatus } = useFetch('/api/notes', {
  key: 'note-references',
  query: { ids: referencedNoteIdsText },
  $fetch: fetchUnlessInputIsEmpty(() => !!referencedNoteIdsText.value),
  default: () => [],
})

const { data: tasks } = useAllTasks()
const { data: accounts } = useAccounts()

const resolvedReferences = computed<ResolvedNoteReference[]>(() => references.value.flatMap((reference): ResolvedNoteReference[] => {
  if (reference.type === 'note') {
    if (reference.noteId === props.id) return []
    const found = referencedNotes.value.find(entry => entry.id === reference.noteId)
    if (found) return [{ type: 'note', raw: reference.raw, note: found }]
    // While the lookup runs, an unknown id is not "not found" yet
    return referencedNotesStatus.value === 'pending' ? [] : [{ type: 'missing', raw: reference.raw }]
  }
  const referencedTask = tasks.value.find(entry => entry.key && normalizeForComparison(entry.key) === reference.normalizedKey)
  if (!referencedTask) return [{ type: 'missing', raw: reference.raw }]
  const owner = accounts.value.find(entry => entry.id === referencedTask.accountId)
  return [{
    type: 'task',
    raw: reference.raw,
    task: { id: referencedTask.id, key: referencedTask.key!, title: referencedTask.title, color: owner?.color ?? '', isMuted: referencedTask.status !== 'open' || owner?.status !== 'active' },
  }]
}))

const noteIdForMentions = computed(() => props.id)
const { data: mentions } = useFetch('/api/notes', {
  key: 'note-mentions',
  query: { mentionsNoteId: noteIdForMentions },
  default: () => [],
})

// --- "[[" opens the reference picker ----------------------------------------
const contentField = useTemplateRef<HTMLTextAreaElement>('contentField')
const isReferencePickerOpen = ref(false)
/** Caret position right after the typed "[[" */
let caretAfterBrackets = 0

function onContentInput(event: Event) {
  const field = event.target as HTMLTextAreaElement
  const caret = field.selectionStart
  if ((event as InputEvent).data?.endsWith('[') && field.value.slice(caret - 2, caret) === '[[') {
    caretAfterBrackets = caret
    isReferencePickerOpen.value = true
  }
}

async function insertReference(referenceText: string) {
  const field = contentField.value
  if (!field || form.content.slice(caretAfterBrackets - 2, caretAfterBrackets) !== '[[') return
  form.content = form.content.slice(0, caretAfterBrackets - 2) + referenceText + form.content.slice(caretAfterBrackets)
  const caret = caretAfterBrackets - 2 + referenceText.length
  await nextTick()
  field.setSelectionRange(caret, caret)
  field.focus()
}

const deleteQuestion = ref(false)
async function remove() {
  const ok = await runAction(() => api(`/api/notes/${currentId}`, { method: 'DELETE' }), NOTE_KEYS)
  if (ok) {
    loaded.value = false
    await navigateTo({ path: '/notes', query: props.listQuery })
  }
}
</script>

<template>
  <div v-if="notFound" class="py-10 text-center text-sm text-muted-foreground">
    Notiz nicht gefunden.
  </div>
  <div v-else-if="loaded" class="grid grid-cols-[minmax(0,1fr)] gap-4">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <Select :model-value="form.kind ?? undefined" @update:model-value="form.kind = $event as NoteKind">
        <SelectTrigger
          size="sm"
          aria-label="Art"
          class="data-[size=sm]:h-9 rounded-md"
          :class="form.kind ? noteKindLook(form.kind).text : ''"
        >
          <SelectValue placeholder="Art" class="!flex items-center gap-1.5">
            <template v-if="form.kind">
              <component :is="noteKindLook(form.kind).icon" class="size-4" aria-hidden="true" />
              {{ noteKindLabels(form.kind).singular }}
            </template>
            <span v-else class="text-muted-foreground">Art</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem v-for="entry in NOTE_KINDS" :key="entry.kind" :value="entry.kind">
            <component :is="noteKindLook(entry.kind).icon" class="size-4" :class="noteKindLook(entry.kind).text" aria-hidden="true" />
            {{ entry.singular }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="flex min-w-0 flex-[1_1_14rem] items-center gap-1 lg:flex-none">
        <label class="block min-w-0 flex-1 lg:w-[300px] lg:flex-[0_1_300px]">
          <span class="sr-only">Bezug</span>
          <AssignmentPicker v-model="form.assignment" placeholder="Bezug wählen …" />
        </label>
        <Button v-if="linkedTaskId" as-child size="icon" variant="ghost" class="shrink-0">
          <NuxtLink :to="`/tasks/${linkedTaskId}`" aria-label="Zur Aufgabe" title="Zur Aufgabe">
            <ExternalLink />
          </NuxtLink>
        </Button>
        <Button v-if="form.assignment" size="icon" variant="ghost" class="shrink-0" aria-label="Bezug entfernen" title="Bezug entfernen" @click="form.assignment = ''">
          <X />
        </Button>
      </div>

      <input
        v-model="form.tagsText"
        aria-label="Tags"
        placeholder="#tags"
        class="h-9 min-w-24 flex-[1_1_8rem] rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 text-[13px] tabular-nums"
          :class="{
            'text-positive/70': status === 'saved',
            'text-destructive': status === 'error',
            'text-muted-foreground': status === 'changed' || status === 'saving',
          }"
          role="status"
        >
          <Check v-if="status === 'saved'" class="size-3.5" />
          <CircleAlert v-else-if="status === 'error'" class="size-3.5" />
          {{ statusText }}
        </span>
        <Button
          size="icon"
          variant="ghost"
          :class="{ 'text-primary hover:text-primary': form.pinned }"
          :aria-label="form.pinned ? 'Lösen' : 'Anpinnen'"
          :aria-pressed="form.pinned"
          :title="form.pinned ? 'Lösen' : 'Anpinnen (erscheint auf „Heute“)'"
          @click="form.pinned = !form.pinned"
        >
          <Pin />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Notiz löschen" title="Löschen" @click="deleteQuestion = true">
          <Trash2 />
        </Button>
      </div>
    </div>

    <textarea
      v-model="form.title"
      rows="1"
      aria-label="Titel"
      placeholder="Titel"
      class="field-sizing-content w-full resize-none rounded-md bg-transparent text-2xl font-semibold tracking-tight wrap-anywhere outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      @keydown.enter.prevent
    />

    <textarea
      ref="contentField"
      v-model="form.content"
      aria-label="Inhalt"
      placeholder="Einfach losschreiben … [[ fügt einen Verweis ein"
      class="field-sizing-content min-h-[50vh] w-full resize-none rounded-md bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      @input="onContentInput"
    />

    <NoteReferences :references="resolvedReferences" :mentions="mentions" :list-query="listQuery" />

    <NoteReferencePicker v-model:open="isReferencePickerOpen" :current-note-id="id" @select="insertReference" />

    <AlertDialog v-model:open="deleteQuestion">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{{ form.title }}“ wird endgültig gelöscht.</AlertDialogDescription>
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
