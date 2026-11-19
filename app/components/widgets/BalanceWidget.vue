<script setup lang="ts">
// Balance until yesterday: +3:15 · today: 5:30 / 8:00 - shown as a pill in the header
defineProps<{
  balanceUntilYesterday: number
  actual: number
  target: number
}>()
</script>

<template>
  <div class="flex h-8 items-center gap-3 rounded-full border px-3 font-mono text-[13px] text-muted-foreground tabular-nums">
    <span title="Stundenkonto bis gestern">Konto <span
      class="font-medium"
      :class="balanceUntilYesterday > 0 ? 'text-positive' : balanceUntilYesterday < 0 ? 'text-negative' : 'text-foreground'"
    >{{ formatBalance(balanceUntilYesterday) }}</span></span>
    <span class="h-3.5 w-px bg-border" />
    <span>heute <span class="font-medium text-foreground">{{ formatDuration(actual) }}</span> / {{ formatDuration(target) }}</span>
  </div>
</template>
