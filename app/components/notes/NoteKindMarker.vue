<script setup lang="ts">
import { noteKindLabels } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'

// Kind of a note as an icon in the kind's tint; the label is the accessible name and tooltip
const props = defineProps<{ kind: NoteKind }>()

const look = computed(() => noteKindLook(props.kind))
const label = computed(() => noteKindLabels(props.kind).singular)
</script>

<template>
  <component :is="look.icon" class="size-3.5 shrink-0" :class="look.text" role="img" :aria-label="label" :title="label" />
</template>
