<script setup lang="ts">
import { format } from 'date-fns'
import { ChevronRight, Plus } from '@lucide/vue'
import { groupNotesByKind, noteKindLabels } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

interface TaskNote {
  id: number
  title: string
  content?: string
  excerpt: string
  kind: NoteKind | null
  pinned: boolean
  updatedAt: string
}

// Notes of one task in sections per kind; rows open in place, read-only and as plain text
const props = defineProps<{ taskId: number, taskTitle: string, notes: TaskNote[], mentioningNotes?: TaskNote[] }>()

// Kind sections, then (when there are notes) "Erwähnt in": notes that reference this task's key, with a neutral rail
const sections = computed(() => [
  ...groupNotesByKind(props.notes).map(section => ({ ...section, id: section.kind ?? 'none', isMentions: false })),
  ...(props.mentioningNotes?.length ? [{ kind: null, title: 'Erwähnt in', notes: props.mentioningNotes, id: 'mentions', isMentions: true }] : []),
])
const openNoteIds = ref(new Set<number>())

function toggle(noteId: number) {
  const next = new Set(openNoteIds.value)
  if (!next.delete(noteId)) next.add(noteId)
  openNoteIds.value = next
}

const emptyText = (kind: NoteKind) => `Noch keine ${noteKindLabels(kind).title}.`
const singularOf = (kind: NoteKind) => noteKindLabels(kind).singular
</script>

<template>
  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle>Notizen</CardTitle>
    </CardHeader>
    <section
      v-for="section in sections"
      :key="section.id"
      class="border-b border-l-[3px] last:border-b-0"
      :class="section.kind ? noteKindLook(section.kind).rail : 'border-l-border'"
      :aria-label="section.title"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <h3 class="flex items-center gap-1.5 text-sm font-semibold" :class="section.kind ? noteKindLook(section.kind).text : 'text-muted-foreground'">
          <component :is="noteKindLook(section.kind).icon" v-if="section.kind" class="size-4" aria-hidden="true" />
          {{ section.title }}
          <span class="font-mono text-xs font-normal text-muted-foreground">{{ section.notes.length }}</span>
        </h3>
        <span v-if="section.kind && !section.notes.length" class="text-sm text-muted-foreground">{{ emptyText(section.kind) }}</span>
        <Button
          v-if="section.kind"
          size="sm"
          variant="outline"
          class="ml-auto h-[30px] text-[13px]"
          @click="newNote(taskTitle, { taskId, kind: section.kind })"
        >
          <Plus /> {{ singularOf(section.kind) }}
        </Button>
      </div>
      <div v-for="note in section.notes" :key="note.id" class="border-t">
        <button
          type="button"
          class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 px-4 py-2 text-left text-sm hover:bg-raised"
          :aria-expanded="openNoteIds.has(note.id)"
          @click="toggle(note.id)"
        >
          <ChevronRight class="size-4 text-muted-foreground transition-transform" :class="{ 'rotate-90': openNoteIds.has(note.id) }" aria-hidden="true" />
          <span class="flex min-w-0 items-center gap-1.5">
            <NoteKindMarker v-if="section.isMentions && note.kind" :kind="note.kind" />
            <span class="fade-end min-w-0 flex-1 font-medium" :title="note.title">{{ note.title }}</span>
          </span>
          <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{{ format(new Date(note.updatedAt), 'dd.MM.yy') }}</span>
          <span v-if="note.excerpt && !openNoteIds.has(note.id)" class="col-start-2 col-end-4 line-clamp-1 wrap-anywhere text-xs text-muted-foreground">{{ note.excerpt }}</span>
        </button>
        <div v-if="openNoteIds.has(note.id)" class="grid gap-2 px-4 pb-3 pl-10">
          <p class="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{{ note.content }}</p>
          <NuxtLink :to="`/notes?id=${note.id}`" class="justify-self-start text-[13px] text-primary hover:underline">
            Bearbeiten
          </NuxtLink>
        </div>
      </div>
    </section>
  </Card>
</template>
