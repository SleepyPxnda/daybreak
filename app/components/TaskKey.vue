<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'

// Task key (e.g. GB-114) as a pill in the color of its account; a key wider than 7.5rem is cut off with a fade
defineProps<{ value: string, color?: string | null }>()

const chip = useTemplateRef<HTMLElement>('chip')
const isCutOff = ref(false)

// The fade is only applied when the key is really cut, so keys that fit are not dimmed
useResizeObserver(chip, () => {
  if (chip.value) isCutOff.value = chip.value.scrollWidth > chip.value.clientWidth
})
</script>

<template>
  <span
    ref="chip"
    :title="value"
    class="inline-block max-w-[7.5rem] shrink-0 overflow-hidden rounded-sm px-1.5 py-px font-mono text-[11px] leading-4 font-medium whitespace-nowrap"
    :class="[accountColorClasses(color).surface, { '[mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)]': isCutOff }]"
  >{{ value }}</span>
</template>
