<script setup lang="ts">
import { BellRing } from '@lucide/vue'
import { istFaellig } from '#shared/utils/todos'
import TodoListe from '~/components/todos/TodoListe.vue'

// Heute-Karten: offene Merker, Warten auf, Daily-Themen.
// Abweichung von Plan §5 (dort nur fällige Warten auf): alle offenen, fällige hervorgehoben und oben.
const { nachArt } = useOffeneTodos()
const merker = nachArt('merker')
const warten = nachArt('warten')
const daily = nachArt('daily')
const anzahlFaellig = computed(() => warten.value.filter(t => istFaellig(t, heute())).length)
</script>

<template>
  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Merker
        <span class="flex items-center gap-3 text-xs font-normal">
          <span class="font-mono text-muted-foreground">{{ merker.length }}</span>
          <NuxtLink to="/todos" class="text-primary hover:underline">alle</NuxtLink>
        </span>
      </CardTitle>
    </CardHeader>
    <TodoListe art="merker" :todos="merker" kompakt leer-text="Keine – „t …“ in der Schnelleingabe." />
  </Card>

  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Warten auf
        <span v-if="anzahlFaellig" class="flex items-center gap-1 text-xs font-medium text-warnung">
          <BellRing class="size-3.5" /> {{ anzahlFaellig }} nachfassen
        </span>
        <span v-else class="font-mono text-xs font-normal text-muted-foreground">{{ warten.length }}</span>
      </CardTitle>
    </CardHeader>
    <TodoListe art="warten" :todos="warten" kompakt leer-text="Keine – „w Wer: …“ in der Schnelleingabe." />
  </Card>

  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Daily-Themen
        <span class="font-mono text-xs font-normal text-muted-foreground">{{ daily.length }}</span>
      </CardTitle>
    </CardHeader>
    <TodoListe art="daily" :todos="daily" kompakt leer-text="Keine – „d …“ in der Schnelleingabe." />
  </Card>
</template>
