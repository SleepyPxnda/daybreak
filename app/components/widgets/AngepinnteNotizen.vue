<script setup lang="ts">
import { Pin } from '@lucide/vue'

// Heute-Karte: angepinnte Notizen (Plan §5)
const { data: notizen } = useFetch('/api/notizen', {
  key: 'notizen-angepinnt',
  query: { angepinnt: '1' },
  default: () => [],
})
</script>

<template>
  <Card v-if="notizen.length" class="gap-0 pb-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Notizen
        <span class="flex items-center gap-3 text-xs font-normal">
          <span class="font-mono text-muted-foreground">{{ notizen.length }}</span>
          <NuxtLink to="/notizen" class="text-primary hover:underline">alle</NuxtLink>
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-1 px-0">
      <NuxtLink
        v-for="n in notizen"
        :key="n.id"
        :to="`/notizen?id=${n.id}`"
        class="grid min-h-10 grid-cols-1 gap-0.5 border-b px-4 py-1.5 text-sm last:border-b-0 hover:bg-raised"
        :title="n.titel"
      >
        <span class="flex items-center gap-1.5 font-medium">
          <Pin class="size-3.5 shrink-0 text-primary" />
          <span class="auslaufen min-w-0 flex-1">{{ n.titel }}</span>
        </span>
        <span v-if="n.ausschnitt" class="line-clamp-2 text-[13px] text-muted-foreground">{{ n.ausschnitt }}</span>
      </NuxtLink>
    </CardContent>
  </Card>
</template>
