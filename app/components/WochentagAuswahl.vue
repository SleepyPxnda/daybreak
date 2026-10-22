<script setup lang="ts">
const tage = defineModel<number[]>({ required: true })

function umschalten(nr: number) {
  tage.value = tage.value.includes(nr) ? tage.value.filter(t => t !== nr) : [...tage.value, nr].sort()
}
</script>

<template>
  <div role="group" aria-label="Wochentage" class="flex flex-wrap gap-1">
    <button
      v-for="t in WOCHENTAGE"
      :key="t.nr"
      type="button"
      class="h-8 w-10 rounded-md text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      :class="tage.includes(t.nr) ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground hover:bg-secondary-hover hover:text-foreground'"
      :aria-pressed="tage.includes(t.nr)"
      @click="umschalten(t.nr)"
    >
      {{ t.kurz }}
    </button>
  </div>
</template>
