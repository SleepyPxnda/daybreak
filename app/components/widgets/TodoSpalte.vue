<script setup lang="ts">
import { istFaellig } from '#shared/utils/todos'
import TodoListe from '~/components/todos/TodoListe.vue'

// Heute-Seitenspalte (Plan §5): offene Merker, Warten auf (nur fällige/überfällige), Daily-Themen
const { nachArt } = useOffeneTodos()
const merker = nachArt('merker')
const warten = nachArt('warten')
const daily = nachArt('daily')
const faelligeWarten = computed(() => warten.value.filter(t => istFaellig(t, heute())))
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between text-base">
        Merker
        <NuxtLink to="/todos" class="text-xs font-normal text-muted-foreground hover:underline">alle</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <TodoListe art="merker" :todos="merker" kompakt leer-text="Keine – „t …“ in der Schnelleingabe." />
    </CardContent>
  </Card>

  <Card v-if="faelligeWarten.length">
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between text-base">
        Nachfassen
        <span class="text-xs font-normal text-muted-foreground">{{ warten.length }} offen</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <TodoListe art="warten" :todos="faelligeWarten" kompakt />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle class="text-base">
        Daily-Themen
      </CardTitle>
    </CardHeader>
    <CardContent>
      <TodoListe art="daily" :todos="daily" kompakt leer-text="Keine – „d …“ in der Schnelleingabe." />
    </CardContent>
  </Card>
</template>
