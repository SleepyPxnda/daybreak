<script setup lang="ts">
import { format } from 'date-fns'
import type { NoteKind } from '#shared/utils/notes'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

export type ResolvedNoteReference
  = | { type: 'note', raw: string, note: { id: number, title: string, kind: NoteKind | null } }
    | { type: 'task', raw: string, task: { id: number, key: string, title: string, color: string, isMuted: boolean } }
    | { type: 'missing', raw: string }

interface MentioningNote {
  id: number
  title: string
  kind: NoteKind | null
  updatedAt: string
}

// "Verweist auf" (references in the text) and "Erwähnt in" (notes that reference this one); links only, the text itself stays plain
defineProps<{
  references: ResolvedNoteReference[]
  mentions: MentioningNote[]
  /** Filters (`tag`, `kind`, `account`) kept on note links */
  listQuery: Record<string, string | undefined>
}>()
</script>

<template>
  <div v-if="references.length || mentions.length" class="grid grid-cols-[minmax(0,1fr)] gap-4 border-t pt-4">
    <section v-if="references.length" aria-labelledby="note-references-heading" class="grid grid-cols-[minmax(0,1fr)] gap-1">
      <h2 id="note-references-heading" class="text-xs font-medium text-muted-foreground">
        Verweist auf
      </h2>
      <ul class="grid grid-cols-[minmax(0,1fr)]">
        <li v-for="reference in references" :key="reference.raw" class="min-w-0">
          <NuxtLink
            v-if="reference.type === 'note'"
            :to="{ path: '/notes', query: { ...listQuery, id: reference.note.id } }"
            class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-raised"
            :title="reference.note.title"
          >
            <NoteKindMarker v-if="reference.note.kind" :kind="reference.note.kind" />
            <span v-else class="size-3.5 shrink-0" aria-hidden="true" />
            <span class="fade-end min-w-0 flex-1">{{ reference.note.title }}</span>
          </NuxtLink>
          <NuxtLink
            v-else-if="reference.type === 'task'"
            :to="`/tasks/${reference.task.id}`"
            class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-raised"
            :class="{ 'text-muted-foreground': reference.task.isMuted }"
            :title="reference.task.title"
          >
            <TaskKey :value="reference.task.key" :color="reference.task.color" :class="{ 'opacity-60': reference.task.isMuted }" />
            <span class="fade-end min-w-0 flex-1">{{ reference.task.title }}</span>
          </NuxtLink>
          <div v-else class="flex min-w-0 items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <span class="fade-end min-w-0 flex-1" :title="reference.raw">{{ reference.raw }}</span>
            <span class="shrink-0 text-xs">nicht gefunden</span>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="mentions.length" aria-labelledby="note-mentions-heading" class="grid grid-cols-[minmax(0,1fr)] gap-1">
      <h2 id="note-mentions-heading" class="text-xs font-medium text-muted-foreground">
        Erwähnt in
      </h2>
      <ul class="grid grid-cols-[minmax(0,1fr)]">
        <li v-for="mention in mentions" :key="mention.id" class="min-w-0">
          <NuxtLink
            :to="{ path: '/notes', query: { ...listQuery, id: mention.id } }"
            class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-raised"
            :title="mention.title"
          >
            <NoteKindMarker v-if="mention.kind" :kind="mention.kind" />
            <span v-else class="size-3.5 shrink-0" aria-hidden="true" />
            <span class="fade-end min-w-0 flex-1">{{ mention.title }}</span>
            <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{{ format(new Date(mention.updatedAt), 'dd.MM.yy') }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
