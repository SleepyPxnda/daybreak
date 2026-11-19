<script setup lang="ts">
const days = defineModel<number[]>({ required: true })

function toggle(nr: number) {
  days.value = days.value.includes(nr) ? days.value.filter(t => t !== nr) : [...days.value, nr].sort()
}
</script>

<template>
  <div role="group" aria-label="Wochentage" class="flex flex-wrap gap-1">
    <button
      v-for="t in WEEKDAYS"
      :key="t.nr"
      type="button"
      class="h-8 w-10 rounded-md text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      :class="days.includes(t.nr) ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground hover:bg-secondary-hover hover:text-foreground'"
      :aria-pressed="days.includes(t.nr)"
      @click="toggle(t.nr)"
    >
      {{ t.short }}
    </button>
  </div>
</template>
