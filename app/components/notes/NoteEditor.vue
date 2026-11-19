<script setup lang="ts">
import { format } from 'date-fns'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Check, CircleAlert, Pin, Trash2 } from '@lucide/vue'
import { normalizeTags } from '#shared/utils/notes'

interface Note {
  id: number
  title: string
  content: string
  tags: string[]
  taskId: number | null
  accountId: number | null
  pinned: boolean
  updatedAt: string
}

// Editor with live preview and autosave
const props = defineProps<{ id: number }>()

const form = reactive({ title: '', content: '', tagsText: '', assignment: '', pinned: false })
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
    currentId = id
    form.title = n.title
    form.content = n.content
    form.tagsText = n.tags.join(', ')
    form.assignment = assignmentValue(n)
    form.pinned = n.pinned
    savedState = JSON.stringify(payload())
    savedAt.value = format(new Date(n.updatedAt), 'dd.MM. HH:mm')
    status.value = 'saved'
    loaded.value = true
  }
  catch {
    notFound.value = true
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

const deleteQuestion = ref(false)
async function remove() {
  const ok = await runAction(() => api(`/api/notes/${currentId}`, { method: 'DELETE' }), NOTE_KEYS)
  if (ok) {
    loaded.value = false
    await navigateTo('/notes')
  }
}

const preview = computed(() => renderMarkdown(form.content))
</script>

<template>
  <div v-if="notFound" class="py-10 text-center text-sm text-muted-foreground">
    Notiz nicht gefunden.
  </div>
  <div v-else-if="loaded" class="grid gap-4">
    <div class="flex items-center gap-2">
      <input
        v-model="form.title"
        aria-label="Titel"
        placeholder="Titel"
        class="min-w-0 flex-1 rounded-md bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
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

    <div class="flex flex-wrap gap-3">
      <div class="grid flex-[1_1_240px] gap-1">
        <label for="note-tags" class="text-xs text-muted-foreground">Tags</label>
        <Input id="note-tags" v-model="form.tagsText" placeholder="durch Komma getrennt" class="h-9 rounded-md" />
      </div>
      <div class="grid min-w-0 flex-[1_1_240px] gap-1">
        <span class="text-xs text-muted-foreground">Bezug</span>
        <div class="flex min-w-0 gap-2">
          <AssignmentPicker v-model="form.assignment" />
          <Button v-if="form.assignment" variant="ghost" @click="form.assignment = ''">
            Bezug entfernen
          </Button>
        </div>
      </div>
    </div>

    <div class="grid min-h-[60vh] overflow-hidden rounded-xl border lg:grid-cols-2">
      <div class="flex flex-col bg-card max-lg:border-b lg:border-r">
        <div class="border-b bg-card px-4 py-2 text-xs text-muted-foreground">
          Markdown
        </div>
        <textarea
          v-model="form.content"
          aria-label="Inhalt (Markdown)"
          placeholder="Markdown …"
          class="min-h-[40vh] flex-1 resize-y bg-transparent p-4 font-mono text-[13px] leading-5 outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div class="flex min-w-0 flex-col">
        <div class="border-b bg-card px-4 py-2 text-xs text-muted-foreground">
          Vorschau
        </div>
        <ClientOnly>
          <div class="markdown flex-1 overflow-auto px-5 py-4">
            <!-- eslint-disable-next-line vue/no-v-html -- sanitized with DOMPurify -->
            <div v-if="form.content.trim()" v-html="preview" />
            <p v-else class="text-sm text-muted-foreground">
              Noch leer – links schreiben, hier erscheint die Vorschau.
            </p>
          </div>
        </ClientOnly>
      </div>
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
