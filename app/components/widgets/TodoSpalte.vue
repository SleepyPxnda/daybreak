<script setup lang="ts">
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

  <Card>
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between text-base">
        Warten auf
        <span v-if="anzahlFaellig" class="text-xs font-medium text-konto-butter">{{ anzahlFaellig }} nachfassen</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <TodoListe art="warten" :todos="warten" kompakt leer-text="Keine – „w Wer: …“ in der Schnelleingabe." />
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
