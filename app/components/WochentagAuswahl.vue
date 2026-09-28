<script setup lang="ts">
const tage = defineModel<number[]>({ required: true })

function umschalten(nr: number) {
  tage.value = tage.value.includes(nr) ? tage.value.filter(t => t !== nr) : [...tage.value, nr].sort()
}
</script>

<template>
  <div class="flex gap-1">
    <Button
      v-for="t in WOCHENTAGE"
      :key="t.nr"
      type="button"
      size="sm"
      class="w-10"
      :variant="tage.includes(t.nr) ? 'default' : 'secondary'"
      :aria-pressed="tage.includes(t.nr)"
      @click="umschalten(t.nr)"
    >
      {{ t.kurz }}
    </Button>
  </div>
</template>
