<script setup lang="ts">
// Uhrzeit-Eingabe im 15-min-Raster, Wert in Minuten seit Mitternacht
const minuten = defineModel<number>({ required: true })

const text = computed({
  get: () => formatUhrzeit(minuten.value),
  set: (wert: string) => {
    const neu = parseUhrzeit(wert)
    if (neu !== undefined) minuten.value = aufRaster(neu)
  },
})
</script>

<template>
  <!-- breit genug für „HH:MM“ + Uhr-Symbol des Browsers (w-28 hat abgeschnitten) -->
  <Input v-model="text" type="time" step="900" class="h-9 w-36 rounded-md font-mono" />
</template>
