<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, Palmtree } from '@lucide/vue'

// Next vacation on the today page: as a card, or as a banner above the timeline once the reminder kicks in
const props = defineProps<{ presentation: 'banner' | 'karte' }>()

const { data } = useFetch('/api/vacation/next', { key: 'next-vacation' })

const vacation = computed(() => data.value?.vacation ?? null)
const highlighted = computed(() => !!data.value && (data.value.notify || !!vacation.value?.running))
const visible = computed(() => (props.presentation === 'banner' ? highlighted.value : !highlighted.value))

const f = (d: string) => format(toDate(d), 'EEE d. MMM', { locale: de })
const range = computed(() => {
  const u = vacation.value
  if (!u) return ''
  return u.from === u.to ? f(u.from) : `${f(u.from)} – ${f(u.to)}`
})
const number = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Confirm after handover: afterwards only the vacation note, without reminder text
function confirm() {
  const u = vacation.value
  if (u) runAction(() => api('/api/vacation/confirm', { method: 'POST', body: { from: u.from, to: u.to } }), ['next-vacation'])
}

const countdown = computed(() => {
  const u = vacation.value
  if (!u) return ''
  if (u.running) return `Im Urlaub bis ${f(u.to)}`
  if (u.daysUntil === 1) return 'Urlaub ab morgen'
  return `Urlaub in ${u.daysUntil} Tagen`
})
</script>

<template>
  <!-- Banner: reminder or ongoing vacation -->
  <div
    v-if="visible && presentation === 'banner' && vacation"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-info-subtle py-2.5 pr-3 pl-4 text-sm"
  >
    <Palmtree class="size-[18px] shrink-0 text-info" />
    <span class="font-semibold text-info">{{ countdown }}</span>
    <span class="tabular-nums">
      {{ range }} · {{ number(vacation.vacationDays) }} Urlaubstag{{ vacation.vacationDays === 1 ? '' : 'e' }}
      <template v-if="!vacation.running"> · noch {{ vacation.workdaysTo }} Arbeitstag{{ vacation.workdaysTo === 1 ? '' : 'e' }} davor</template>
    </span>
    <Button v-if="!vacation.running && !vacation.confirmed" size="sm" variant="outline" class="ml-auto" @click="confirm">
      <Check /> Bestätigen
    </Button>
    <span v-if="!vacation.running && !vacation.confirmed && data?.bookingNotificationText" class="basis-full pl-[30px] text-muted-foreground">{{ data.bookingNotificationText }}</span>
  </div>

  <!-- Card below the timeline -->
  <Card v-else-if="visible && presentation === 'karte'">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Palmtree class="size-4 text-info" /> Nächster Urlaub
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-1 text-sm tabular-nums">
      <template v-if="vacation">
        <span class="font-medium">{{ range }}</span>
        <span class="text-muted-foreground">
          {{ countdown.replace('Urlaub ', '') }} · {{ number(vacation.vacationDays) }} Urlaubstag{{ vacation.vacationDays === 1 ? '' : 'e' }}
        </span>
      </template>
      <NuxtLink v-else to="/calendar" class="text-muted-foreground hover:text-foreground hover:underline">
        Kein Urlaub geplant – im Kalender eintragen
      </NuxtLink>
    </CardContent>
  </Card>
</template>
