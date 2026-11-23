<script setup lang="ts">
import { NOTE_KINDS } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'

// Kind of a note as icon plus label in the kind's tint
const props = defineProps<{ kind: NoteKind }>()

const look = computed(() => noteKindLook(props.kind))
const label = computed(() => NOTE_KINDS.find(entry => entry.kind === props.kind)!.singular)
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-1 text-xs font-medium" :class="look.text">
    <component :is="look.icon" class="size-3.5" aria-hidden="true" />
    {{ label }}
  </span>
</template>
