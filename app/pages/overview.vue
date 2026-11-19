<script setup lang="ts">
import { addMonths, endOfISOWeek, endOfMonth, format, getISOWeek, startOfISOWeek, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import AccountTree from '~/components/overview/AccountTree.vue'
import MonthClosing from '~/components/overview/MonthClosing.vue'
import BalanceHistory from '~/components/widgets/BalanceHistory.vue'

// Overview: pick a range, booked time grouped account -> task -> days, month closing, balance history
useHead({ title: 'Übersicht · daybreak' })

type Mode = 'week' | 'month' | 'custom' | 'month-closing'
const MODES: { mode: Mode, label: string }[] = [
  { mode: 'week', label: 'Woche' },
  { mode: 'month', label: 'Monat' },
  { mode: 'custom', label: 'Frei' },
  { mode: 'month-closing', label: 'Monatsabschluss' },
]

const route = useRoute()
const mode = computed<Mode>(() => (['week', 'custom', 'month-closing'].includes(String(route.query.mode)) ? route.query.mode as Mode : 'month'))
const anchor = computed(() => {
  const d = String(route.query.date ?? '')
  return toDate(isIsoDate(d) ? d : today())
})

const range = computed(() => {
  if (mode.value === 'week') return { from: toIsoDate(startOfISOWeek(anchor.value)), to: toIsoDate(endOfISOWeek(anchor.value)) }
  if (mode.value !== 'custom') return { from: toIsoDate(startOfMonth(anchor.value)), to: toIsoDate(endOfMonth(anchor.value)) }
  const from = String(route.query.from ?? '')
  const to = String(route.query.to ?? '')
  return {
    from: isIsoDate(from) ? from : toIsoDate(startOfMonth(new Date())),
    to: isIsoDate(to) ? to : today(),
  }
})
const rangeError = computed(() => {
  const { from, to } = range.value
  if (from > to) return '„Von“ muss vor „Bis“ liegen.'
  if (daysBetween(from, to) > 366) return 'Höchstens ein Jahr auswählen.'
  return ''
})

const title = computed(() => {
  const { from, to } = range.value
  if (mode.value === 'week') return `KW ${getISOWeek(toDate(from))} · ${format(toDate(from), 'd. MMM', { locale: de })} – ${format(toDate(to), 'd. MMM yyyy', { locale: de })}`
  if (mode.value !== 'custom') return format(toDate(from), 'MMMM yyyy', { locale: de })
  return `${format(toDate(from), 'd. MMM yyyy', { locale: de })} – ${format(toDate(to), 'd. MMM yyyy', { locale: de })}`
})

function setQuery(part: Record<string, string | undefined>) {
  navigateTo({ query: { ...route.query, ...part } }, { replace: true })
}
function modeSwitch(newMode: Mode) {
  // A custom range starts with the currently shown one
  if (newMode === 'custom') setQuery({ mode: newMode, date: undefined, from: range.value.from, to: range.value.to })
  else setQuery({ mode: newMode, from: undefined, to: undefined })
}
function browse(direction: number) {
  const destination = mode.value === 'week' ? addDays(toIsoDate(anchor.value), direction * 7) : toIsoDate(addMonths(anchor.value, direction))
  setQuery({ date: destination })
}
</script>

<template>
  <div class="grid gap-8 xl:grid-cols-[1fr_22rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-6">
      <!-- Header: range -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <template v-if="mode !== 'custom'">
            <Button size="icon" variant="ghost" :aria-label="mode === 'week' ? 'Vorherige Woche' : 'Vorheriger Monat'" @click="browse(-1)">
              <ChevronLeft />
            </Button>
            <h1 class="w-72 shrink-0 text-center text-2xl font-semibold tracking-tight">
              {{ title }}
            </h1>
            <Button size="icon" variant="ghost" :aria-label="mode === 'week' ? 'Nächste Woche' : 'Nächster Monat'" @click="browse(1)">
              <ChevronRight />
            </Button>
          </template>
          <template v-else>
            <h1 class="text-2xl font-semibold tracking-tight">
              Übersicht
            </h1>
            <Input type="date" class="w-40" aria-label="Von" :model-value="range.from" @change="setQuery({ from: ($event.target as HTMLInputElement).value || undefined })" />
            <span class="text-muted-foreground">–</span>
            <Input type="date" class="w-40" aria-label="Bis" :model-value="range.to" @change="setQuery({ to: ($event.target as HTMLInputElement).value || undefined })" />
          </template>
        </div>
        <div class="inline-flex gap-0.5 rounded-md border bg-raised p-[3px]" role="group" aria-label="Zeitraum">
          <button
            v-for="m in MODES"
            :key="m.mode"
            type="button"
            class="h-[30px] rounded-[6px] px-3 text-[13px] font-medium transition-colors"
            :class="mode === m.mode ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="mode === m.mode"
            @click="modeSwitch(m.mode)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <p v-if="rangeError" class="text-sm text-negativ">
        {{ rangeError }}
      </p>
      <MonthClosing v-else-if="mode === 'month-closing'" :from="range.from" :to="range.to" />
      <AccountTree v-else :from="range.from" :to="range.to" />
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <BalanceHistory />
    </aside>
  </div>
</template>
