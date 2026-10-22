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
  <Card v-if="urlaub" class="gap-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        Urlaub {{ jahr }}
        <NuxtLink to="/einstellungen#urlaub" class="text-[13px] font-medium text-primary hover:underline">Bearbeiten</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-5 pb-3 text-center">
      <div class="font-mono text-4xl font-medium tabular-nums" :class="urlaub.rest < 0 ? 'text-negativ' : ''">
        {{ zahl(urlaub.rest) }}
      </div>
      <div class="text-[13px] text-muted-foreground">
        Tage übrig
      </div>
    </CardContent>

    <CardContent class="grid text-sm">
      <button type="button" class="flex items-center justify-between border-b py-2 text-left hover:text-primary" :aria-expanded="postenOffen" @click="postenOffen = !postenOffen">
        <span class="flex items-center gap-1">
          <ChevronRight class="size-3.5 text-muted-foreground transition-transform" :class="{ 'rotate-90': postenOffen }" /> Anspruch
        </span>
        <span class="font-mono tabular-nums">{{ zahl(urlaub.anspruch) }}</span>
      </button>
      <template v-if="postenOffen">
        <p v-if="!urlaub.posten.length" class="border-b py-2 pl-3 text-[13px] text-muted-foreground">
          Keine Posten – in den Einstellungen anlegen.
        </p>
        <div v-for="p in urlaub.posten" :key="p.id" class="flex justify-between gap-2 border-b py-2 pl-3 text-[13px] text-muted-foreground">
          <span class="truncate">{{ p.bezeichnung }} <span class="opacity-70">({{ ART[p.art] }})</span></span>
          <span class="font-mono tabular-nums">{{ p.tage > 0 ? '+' : '' }}{{ zahl(p.tage) }}</span>
        </div>
      </template>
      <div class="flex justify-between border-b py-2">
        <span>genommen</span><span class="font-mono tabular-nums">−{{ zahl(urlaub.genommen) }}</span>
      </div>
      <div class="flex justify-between py-2">
        <span>geplant</span><span class="font-mono tabular-nums">−{{ zahl(urlaub.geplant) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
