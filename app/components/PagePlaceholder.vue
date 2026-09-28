<script setup lang="ts">
const props = defineProps<{ title: string, phase: number }>()

useHead({ title: () => `${props.title} · Daybreak` })
</script>

<template>
  <div class="space-y-2">
    <h1 class="text-2xl font-semibold">
      {{ title }}
    </h1>
    <p class="text-muted-foreground">
      Kommt in Phase {{ phase }}.
    </p>
  </div>
</template>
