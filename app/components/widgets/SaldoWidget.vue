<script setup lang="ts">
// Plan §3.4: „Konto bis gestern: +3:15 · heute: 5:30 / 8:00“ – als Pille in der Kopfzeile
defineProps<{
  kontoBisGestern: number
  ist: number
  soll: number
}>()
</script>

<template>
  <div class="flex h-8 items-center gap-3 rounded-full border px-3 font-mono text-[13px] text-muted-foreground tabular-nums">
    <span title="Stundenkonto bis gestern">Konto <span
      class="font-medium"
      :class="kontoBisGestern > 0 ? 'text-positiv' : kontoBisGestern < 0 ? 'text-negativ' : 'text-foreground'"
    >{{ formatSaldo(kontoBisGestern) }}</span></span>
    <span class="h-3.5 w-px bg-border" />
    <span>heute <span class="font-medium text-foreground">{{ formatDauer(ist) }}</span> / {{ formatDauer(soll) }}</span>
  </div>
</template>
