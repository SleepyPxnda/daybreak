<script setup lang="ts">
// Aufgaben-Key (z. B. GB-114) als Pill in der Farbe seines Kontos
defineProps<{ wert: string, farbe?: string | null }>()
</script>

<template>
  <span class="inline-block shrink-0 rounded-sm px-1.5 py-px font-mono text-[11px] leading-4 font-medium" :class="kontoFarbKlassen(farbe).flaeche">{{ wert }}</span>
</template>
