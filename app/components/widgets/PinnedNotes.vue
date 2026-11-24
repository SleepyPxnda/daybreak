<script setup lang="ts">
import { Pin } from '@lucide/vue'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

// Today card: pinned notes
const { data: notes } = useFetch('/api/notes', {
  key: 'notes-pinned',
  query: { pinned: '1' },
  default: () => [],
})
</script>

<template>
  <Card v-if="notes.length" class="gap-0 pb-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Notizen
        <span class="flex items-center gap-3 text-xs font-normal">
          <span class="font-mono text-muted-foreground">{{ notes.length }}</span>
          <NuxtLink to="/notes" class="text-primary hover:underline">alle</NuxtLink>
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-[minmax(0,1fr)] px-0">
      <NuxtLink
        v-for="note in notes"
        :key="note.id"
        :to="`/notes?id=${note.id}`"
        class="grid min-h-10 grid-cols-[minmax(0,1fr)] gap-0.5 border-b px-4 py-1.5 text-sm last:border-b-0 hover:bg-raised"
        :title="note.title"
      >
        <span class="flex min-w-0 items-center gap-1.5 font-medium">
          <Pin class="size-3.5 shrink-0 text-primary" />
          <span class="fade-end min-w-0 flex-1" :title="note.title">{{ note.title }}</span>
          <NoteKindMarker v-if="note.kind" :kind="note.kind" />
        </span>
        <span v-if="note.excerpt" class="line-clamp-2 text-[13px] text-muted-foreground">{{ note.excerpt }}</span>
      </NuxtLink>
    </CardContent>
  </Card>
</template>
