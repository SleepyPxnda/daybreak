<script setup lang="ts">
// Plan §3.4: „Konto bis gestern: +3:15 · heute: 5:30 / 8:00“
defineProps<{
  kontoBisGestern: number
  ist: number
  soll: number
}>()
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm tabular-nums">
    <span class="text-muted-foreground">Konto bis gestern:</span>
    <span
      class="font-semibold"
      :class="kontoBisGestern > 0 ? 'text-positiv' : kontoBisGestern < 0 ? 'text-negativ' : ''"
    >{{ formatSaldo(kontoBisGestern) }}</span>
    <span class="text-muted-foreground">·</span>
    <span class="text-muted-foreground">heute:</span>
    <span class="font-semibold">{{ formatDauer(ist) }} / {{ formatDauer(soll) }}</span>
  </div>
</template>
