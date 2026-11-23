<script setup lang="ts">
import { NOTE_KINDS } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'

// Kind of a note as an icon in the kind's tint; the label is the accessible name and tooltip
const props = defineProps<{ kind: NoteKind }>()

const look = computed(() => noteKindLook(props.kind))
const label = computed(() => NOTE_KINDS.find(entry => entry.kind === props.kind)!.singular)
</script>

<template>
  <component :is="look.icon" class="size-3.5 shrink-0" :class="look.text" role="img" :aria-label="label" :title="label" />
</template>
