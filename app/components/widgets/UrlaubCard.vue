<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

// Urlaubskonto-Karte (Plan §3.5): Anspruch (aufklappbar) · genommen · geplant · Rest
const props = defineProps<{ jahr: number }>()

const { data: urlaub } = useFetch('/api/urlaub', { key: 'urlaub', query: { jahr: toRef(props, 'jahr') } })
const postenOffen = ref(false)

const zahl = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const ART: Record<string, string> = { grund: 'Grund', zusatz: 'Zusatz', rest: 'Rest' }
</script>

<template>
  <Card v-if="urlaub">
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between">
        Urlaub {{ jahr }}
        <NuxtLink to="/einstellungen#urlaub" class="text-xs font-normal text-muted-foreground hover:underline">bearbeiten</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-3 tabular-nums">
      <div class="text-center">
        <div class="text-4xl font-semibold" :class="urlaub.rest < 0 ? 'text-negativ' : ''">
          {{ zahl(urlaub.rest) }}
        </div>
        <div class="text-sm text-muted-foreground">
          Tage übrig
        </div>
      </div>

      <div class="grid gap-1 text-sm">
        <button type="button" class="flex items-center justify-between rounded-md py-0.5 hover:bg-accent/50" @click="postenOffen = !postenOffen">
          <span class="flex items-center gap-1">
            <ChevronRight class="size-4 transition-transform" :class="{ 'rotate-90': postenOffen }" /> Anspruch
          </span>
          <span>{{ zahl(urlaub.anspruch) }}</span>
        </button>
        <div v-if="postenOffen" class="grid gap-0.5 pl-5 text-xs text-muted-foreground">
          <p v-if="!urlaub.posten.length">
            Keine Posten – in den Einstellungen anlegen.
          </p>
          <div v-for="p in urlaub.posten" :key="p.id" class="flex justify-between gap-2">
            <span class="truncate">{{ p.bezeichnung }} <span class="opacity-70">({{ ART[p.art] }})</span></span>
            <span>{{ p.tage > 0 ? '+' : '' }}{{ zahl(p.tage) }}</span>
          </div>
        </div>
        <div class="flex justify-between">
          <span class="pl-5">genommen</span><span>−{{ zahl(urlaub.genommen) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="pl-5">geplant</span><span>−{{ zahl(urlaub.geplant) }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
