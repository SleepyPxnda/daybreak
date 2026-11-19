<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { vacationWindowText } from '#shared/utils/vacation'

// Vacation card: entitlement (expandable) · taken · planned · remaining
const props = defineProps<{ year: number }>()

const { data: vacation } = useFetch('/api/vacation', { key: 'vacation', query: { year: toRef(props, 'year') } })
const entitlementsOpen = ref(false)

const number = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const KIND_LABELS: Record<string, string> = { base: 'Grund', extra: 'Zusatz', carryover: 'Rest' }

interface EntitlementLine {
  key: string
  label: string
  handedOnFromYear?: number
  kind: string
  days: number
  windowText: string | null
  status: string | null
}

// Exactly one status per limited entry: forfeited (window over), used up, passed on, or still open
function limitedStatus(entry: { remaining: number, forfeited: number }, passesToNextYear: boolean) {
  if (entry.forfeited > 0) return `${number(entry.forfeited)} verfallen`
  if (entry.remaining <= 0) return 'aufgebraucht'
  if (passesToNextYear) return `${number(entry.remaining)} weiter in ${props.year + 1}`
  return `${number(entry.remaining)} übrig`
}

const entitlementLines = computed<EntitlementLine[]>(() => {
  if (!vacation.value) return []
  const own = vacation.value.entitlements.map((entry) => {
    const limited = entry.validFrom != null || entry.validUntil != null
    return {
      key: `own:${entry.id}`,
      label: entry.label,
      kind: entry.kind,
      days: entry.days,
      windowText: limited ? vacationWindowText(entry.validFrom, entry.validUntil, props.year) : null,
      status: limited ? limitedStatus(entry, entry.passesToNextYear) : null,
    }
  })
  const handedOn = vacation.value.handedOnEntitlements.map(entry => ({
    key: `handedOn:${entry.fromYear}:${entry.label}:${entry.validFrom}`,
    label: entry.label,
    handedOnFromYear: entry.fromYear,
    kind: entry.kind,
    days: entry.days,
    windowText: vacationWindowText(entry.validFrom, entry.validUntil, props.year),
    status: limitedStatus(entry, false),
  }))
  return [...own, ...handedOn]
})
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
      <div class="font-mono text-4xl font-medium tabular-nums" :class="vacation.carryover < 0 ? 'text-negative' : ''">
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
        <p v-if="!entitlementLines.length" class="border-b py-2 pl-3 text-[13px] text-muted-foreground">
          Keine Posten – in den Einstellungen anlegen.
        </p>
        <div v-for="line in entitlementLines" :key="line.key" class="border-b py-2 pl-3 text-[13px] text-muted-foreground">
          <div class="flex justify-between gap-2">
            <span class="truncate">{{ line.label }}<template v-if="line.handedOnFromYear"> (aus {{ line.handedOnFromYear }})</template> <span class="opacity-70">({{ KIND_LABELS[line.kind] }})</span></span>
            <span class="font-mono tabular-nums">{{ line.days > 0 ? '+' : '' }}{{ number(line.days) }}</span>
          </div>
          <div v-if="line.windowText" class="text-xs">
            {{ line.windowText }} · <span class="text-foreground">{{ line.status }}</span>
          </div>
        </div>
      </template>
      <div class="flex justify-between border-b py-2">
        <span>genommen</span><span class="font-mono tabular-nums">−{{ number(vacation.taken) }}</span>
      </div>
      <div class="flex justify-between py-2" :class="{ 'border-b': vacation.forfeited > 0 }">
        <span>geplant</span><span class="font-mono tabular-nums">−{{ number(vacation.planned) }}</span>
      </div>
      <div v-if="vacation.forfeited > 0" class="flex justify-between py-2">
        <span>verfallen</span><span class="font-mono tabular-nums">−{{ number(vacation.forfeited) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
