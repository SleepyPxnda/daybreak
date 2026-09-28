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
  <Card v-if="notizen.length">
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between text-base">
        Notizen
        <NuxtLink to="/notizen" class="text-xs font-normal text-muted-foreground hover:underline">alle</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-1">
      <NuxtLink
        v-for="n in notizen"
        :key="n.id"
        :to="`/notizen?id=${n.id}`"
        class="grid gap-0.5 rounded-md px-1 py-1.5 text-sm hover:bg-accent/50"
      >
        <span class="flex items-center gap-1.5 font-medium">
          <Pin class="size-3.5 shrink-0 text-primary" />
          <span class="truncate">{{ n.titel }}</span>
        </span>
        <span v-if="n.ausschnitt" class="line-clamp-2 text-xs text-muted-foreground">{{ n.ausschnitt }}</span>
      </NuxtLink>
    </CardContent>
  </Card>
</template>
