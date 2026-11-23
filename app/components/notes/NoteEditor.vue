<script setup lang="ts">
import { format } from 'date-fns'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Check, CircleAlert, Pin, Trash2 } from '@lucide/vue'
import { NOTE_KINDS, normalizeTags } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'

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
const props = defineProps<{ id: number }>()
const route = useRoute()

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
    const n = await api<Note>(`/api/notes/${id}`)
    if (id !== props.id) return // a late response for a note that is no longer selected
    currentId = id
    form.title = n.title
    form.content = n.content
    form.kind = n.kind
    form.tagsText = n.tags.join(', ')
    form.assignment = assignmentValue(n)
    form.pinned = n.pinned
    savedState = JSON.stringify(payload())
    savedAt.value = format(new Date(n.updatedAt), 'dd.MM. HH:mm')
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

const deleteQuestion = ref(false)
async function remove() {
  const ok = await runAction(() => api(`/api/notes/${currentId}`, { method: 'DELETE' }), NOTE_KEYS)
  if (ok) {
    loaded.value = false
    await navigateTo({ path: '/notes', query: { tag: route.query.tag, kind: route.query.kind } })
  }
}
</script>

<template>
  <div v-if="notFound" class="py-10 text-center text-sm text-muted-foreground">
    Notiz nicht gefunden.
  </div>
  <div v-else-if="loaded" class="grid grid-cols-[minmax(0,1fr)] gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="form.title"
        aria-label="Titel"
        placeholder="Titel"
        class="min-w-0 flex-[1_1_12rem] rounded-md bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
      <span
        class="inline-flex shrink-0 items-center gap-1.5 text-[13px] tabular-nums"
        :class="{
          'text-positive': status === 'saved',
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

    <div class="grid gap-1">
      <span id="note-kind-label" class="text-xs text-muted-foreground">Art</span>
      <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="note-kind-label">
        <button
          v-for="entry in NOTE_KINDS"
          :key="entry.kind"
          type="button"
          role="radio"
          :aria-checked="form.kind === entry.kind"
          class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors"
          :class="form.kind === entry.kind
            ? [noteKindLook(entry.kind).surface, noteKindLook(entry.kind).text, 'border-current font-medium']
            : 'bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="form.kind = entry.kind"
        >
          <component :is="noteKindLook(entry.kind).icon" class="size-4" aria-hidden="true" />
          {{ entry.singular }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <div class="grid min-w-0 flex-[1_1_240px] gap-1">
        <label for="note-tags" class="text-xs text-muted-foreground">Tags</label>
        <Input id="note-tags" v-model="form.tagsText" placeholder="durch Komma oder Leerzeichen getrennt" class="h-9 rounded-md" />
      </div>
      <div class="grid min-w-0 flex-[1_1_240px] gap-1">
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Bezug</span>
          <NuxtLink v-if="linkedTaskId" :to="`/tasks/${linkedTaskId}`" class="text-primary hover:underline">
            Zur Aufgabe
          </NuxtLink>
        </div>
        <div class="flex min-w-0 flex-wrap gap-2">
          <AssignmentPicker v-model="form.assignment" />
          <Button v-if="form.assignment" variant="ghost" @click="form.assignment = ''">
            Bezug entfernen
          </Button>
        </div>
      </div>
    </div>

    <div class="grid gap-1">
      <label for="note-content" class="text-xs text-muted-foreground">Inhalt</label>
      <textarea
        id="note-content"
        v-model="form.content"
        placeholder="Einfach losschreiben …"
        class="min-h-[60vh] w-full resize-y rounded-xl border bg-card p-4 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>

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
