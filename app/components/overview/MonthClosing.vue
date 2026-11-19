<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// Month closing: day by day start, end, break, actual/target and booked time per account with keys
const props = defineProps<{ from: string, to: string }>()

const { data: days } = useFetch('/api/overview/month-closing', {
  key: 'month-closing',
  query: { from: toRef(props, 'from'), to: toRef(props, 'to') },
  default: () => [],
})

const TYPE_LABELS: Record<string, string> = { vacation: 'Urlaub', half_vacation: '½ Urlaub', sick: 'Krank', flex_day: 'Gleittag' }
function dayLabel(t: { holiday?: string, type: string, isWorkday: boolean }) {
  if (t.holiday) return t.holiday
  if (t.isWorkday && t.type !== 'work') return TYPE_LABELS[t.type]
  return undefined
}

// Hide free days without bookings (weekend); holidays and absences stay visible
const visibleDays = computed(() => days.value.filter(t => t.actual || t.target || dayLabel(t)))
const todayDate = today()

const sum = computed(() => {
  const accounts = new Map<number, { accountId: number, name: string, color: string | null, minutes: number }>()
  for (const k of days.value.flatMap(t => t.accounts)) {
    const s = accounts.get(k.accountId) ?? { accountId: k.accountId, name: k.name, color: k.color, minutes: 0 }
    s.minutes += k.minutes
    accounts.set(k.accountId, s)
  }
  return {
    actual: days.value.reduce((s, t) => s + t.actual, 0),
    target: days.value.reduce((s, t) => s + t.target, 0),
    isBreak: days.value.reduce((s, t) => s + t.isBreak, 0),
    accounts: [...accounts.values()].sort((a, b) => b.minutes - a.minutes),
  }
})

const time = (min: number | null) => (min == null ? '–' : formatTime(min))

// Durations as h:mm or decimal hours (1:15 -> 1.25); start/end stay clock times
const decimal = useCookie<boolean>('daybreak-month-closing-decimal', { default: () => false, maxAge: 60 * 60 * 24 * 365 })
const duration = (min: number) => (decimal.value ? formatDecimal(min) : formatDuration(min))
</script>

<template>
  <!-- Month total -->
  <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
    <div class="bg-background p-4">
      <div class="text-sm text-muted-foreground">
        Gebucht
      </div>
      <div class="font-mono text-2xl font-medium tabular-nums">
        {{ duration(sum.actual) }}
      </div>
    </div>
    <div class="bg-background p-4">
      <div class="text-sm text-muted-foreground">
        Soll
      </div>
      <div class="font-mono text-2xl font-medium text-muted-foreground tabular-nums">
        {{ duration(sum.target) }}
      </div>
    </div>
    <div class="bg-background p-4">
      <div class="text-sm text-muted-foreground">
        Differenz
      </div>
      <div class="font-mono text-2xl font-medium tabular-nums" :class="sum.actual - sum.target >= 0 ? 'text-positive' : 'text-negative'">
        {{ formatBalance(sum.actual - sum.target, duration) }}
      </div>
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3">
    <span class="font-mono text-[13px] text-muted-foreground tabular-nums">Pausen <span class="text-foreground">{{ duration(sum.isBreak) }}</span></span>
    <div class="inline-flex gap-0.5 rounded-md border bg-raised p-[3px]" role="group" aria-label="Darstellung der Dauer">
      <button
        type="button"
        class="h-[30px] rounded-[6px] px-3 text-[13px] font-medium transition-colors"
        :class="decimal ? 'text-muted-foreground hover:text-foreground' : 'bg-primary/12 text-primary'"
        :aria-pressed="!decimal"
        @click="decimal = false"
      >
        h:mm
      </button>
      <button
        type="button"
        class="h-[30px] rounded-[6px] px-3 text-[13px] font-medium transition-colors"
        :class="decimal ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'"
        :aria-pressed="decimal"
        @click="decimal = true"
      >
        Dezimal
      </button>
    </div>
  </div>

  <section class="min-w-0 overflow-hidden rounded-xl border bg-background text-sm">
    <div class="grid min-h-9 grid-cols-[9rem_7.5rem_5rem_minmax(0,1fr)_7rem] items-center gap-3 border-b bg-card px-4 text-xs text-muted-foreground">
      <span>Tag</span><span>Start – Ende</span><span class="text-right">Pause</span><span /><span class="text-right">Ist / Soll</span>
    </div>

    <div
      v-for="t in visibleDays"
      :key="t.date"
      class="grid min-h-11 content-center gap-1 border-b px-4 py-2.5 last:border-b-0 hover:bg-raised"
      :class="{ 'opacity-60': t.date > todayDate }"
    >
      <div class="grid grid-cols-[9rem_7.5rem_5rem_minmax(0,1fr)_7rem] items-baseline gap-3">
        <NuxtLink :to="t.date === todayDate ? '/' : `/?date=${t.date}`" class="font-medium hover:text-primary">
          {{ format(toDate(t.date), 'EEE d.M.', { locale: de }) }}
        </NuxtLink>
        <span class="font-mono tabular-nums">{{ time(t.start) }} – {{ time(t.end) }}</span>
        <span class="text-right font-mono tabular-nums">{{ t.start == null ? '–' : duration(t.isBreak) }}</span>
        <span class="flex min-w-0 flex-wrap items-baseline gap-2">
          <Badge v-if="dayLabel(t)" variant="secondary">{{ dayLabel(t) }}</Badge>
          <span v-if="!t.actual && t.target && t.date < todayDate" class="text-xs text-negative">keine Buchung</span>
          <span v-if="t.note" class="truncate text-xs text-muted-foreground">{{ t.note }}</span>
        </span>
        <span class="text-right font-mono tabular-nums">
          {{ duration(t.actual) }}<span class="text-muted-foreground"> / {{ duration(t.target) }}</span>
        </span>
      </div>

      <div
        v-for="k in t.accounts"
        :key="k.accountId"
        class="grid grid-cols-[9rem_7.5rem_5rem_minmax(0,1fr)_7rem] items-baseline gap-3 text-[13px] text-muted-foreground"
      >
        <span class="col-span-2 flex min-w-0 items-center gap-2 pl-3 text-foreground">
          <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(k.color).dot" />
          <span class="truncate">{{ k.name }}</span>
        </span>
        <span class="text-right font-mono text-foreground tabular-nums">{{ duration(k.minutes) }}</span>
        <span class="col-span-2 min-w-0 truncate" :title="k.labels.join(', ')">{{ k.labels.join(', ') }}</span>
      </div>
    </div>

    <!-- Month total per account -->
    <div v-if="sum.accounts.length" class="grid gap-1 border-t bg-card px-4 py-2.5">
      <span class="text-xs text-muted-foreground">Monat je Konto</span>
      <div v-for="k in sum.accounts" :key="k.accountId" class="grid grid-cols-[9rem_7.5rem_5rem_minmax(0,1fr)_7rem] items-baseline gap-3">
        <span class="col-span-2 flex min-w-0 items-center gap-2 pl-3">
          <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(k.color).dot" />
          <span class="truncate">{{ k.name }}</span>
        </span>
        <span class="text-right font-mono font-medium tabular-nums">{{ duration(k.minutes) }}</span>
      </div>
    </div>
  </section>
</template>
