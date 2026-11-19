<script setup lang="ts">
// Task key (e.g. GB-114) as a pill in the color of its account
defineProps<{ value: string, color?: string | null }>()
</script>

<template>
  <span class="inline-block shrink-0 rounded-sm px-1.5 py-px font-mono text-[11px] leading-4 font-medium" :class="accountColorClasses(color).surface">{{ value }}</span>
</template>
