<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

// Vacation card: entitlement (expandable) · taken · planned · remaining
const props = defineProps<{ year: number }>()

const { data: vacation } = useFetch('/api/vacation', { key: 'vacation', query: { year: toRef(props, 'year') } })
const entitlementsOpen = ref(false)

const number = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const KIND_LABELS: Record<string, string> = { grund: 'Grund', zusatz: 'Zusatz', rest: 'Rest' }
</script>

<template>
  <Card v-if="vacation" class="gap-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        Urlaub {{ year }}
        <NuxtLink to="/settings#vacation" class="text-[13px] font-medium text-primary hover:underline">Bearbeiten</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-5 pb-3 text-center">
      <div class="font-mono text-4xl font-medium tabular-nums" :class="vacation.carryover < 0 ? 'text-negativ' : ''">
        {{ number(vacation.carryover) }}
      </div>
      <div class="text-[13px] text-muted-foreground">
        Tage übrig
      </div>
    </CardContent>

    <CardContent class="grid text-sm">
      <button type="button" class="flex items-center justify-between border-b py-2 text-left hover:text-primary" :aria-expanded="entitlementsOpen" @click="entitlementsOpen = !entitlementsOpen">
        <span class="flex items-center gap-1">
          <ChevronRight class="size-3.5 text-muted-foreground transition-transform" :class="{ 'rotate-90': entitlementsOpen }" /> Anspruch
        </span>
        <span class="font-mono tabular-nums">{{ number(vacation.entitlement) }}</span>
      </button>
      <template v-if="entitlementsOpen">
        <p v-if="!vacation.entitlements.length" class="border-b py-2 pl-3 text-[13px] text-muted-foreground">
          Keine Posten – in den Einstellungen anlegen.
        </p>
        <div v-for="p in vacation.entitlements" :key="p.id" class="flex justify-between gap-2 border-b py-2 pl-3 text-[13px] text-muted-foreground">
          <span class="truncate">{{ p.label }} <span class="opacity-70">({{ KIND_LABELS[p.kind] }})</span></span>
          <span class="font-mono tabular-nums">{{ p.days > 0 ? '+' : '' }}{{ number(p.days) }}</span>
        </div>
      </template>
      <div class="flex justify-between border-b py-2">
        <span>genommen</span><span class="font-mono tabular-nums">−{{ number(vacation.taken) }}</span>
      </div>
      <div class="flex justify-between py-2">
        <span>geplant</span><span class="font-mono tabular-nums">−{{ number(vacation.planned) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
