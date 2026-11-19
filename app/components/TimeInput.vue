<script setup lang="ts">
// Time input on the 15-minute grid, value in minutes since midnight
const minutes = defineModel<number>({ required: true })

const text = computed({
  get: () => formatTime(minutes.value),
  set: (value: string) => {
    const parsed = parseTime(value)
    if (parsed !== undefined) minutes.value = snapToGrid(parsed)
  },
})
</script>

<template>
  <!-- wide enough for "HH:MM" plus the browser's clock icon (w-28 clipped it) -->
  <Input v-model="text" type="time" step="900" class="h-9 w-36 rounded-md font-mono" />
</template>
