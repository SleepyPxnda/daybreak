<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { VisAxis, VisLine, VisScatter, VisXYContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import { ChartContainer, ChartCrosshair, ChartTooltip } from '@/components/ui/chart'
import type { MonthBalance } from '#shared/utils/balance'

// Balance history: balance at month end as a line, below it month delta + current balance
const { data: history } = useFetch('/api/balance/history', { key: 'balance-history', default: () => [] as MonthBalance[] })

const chartConfig = { state: { label: 'Kontostand', color: 'var(--primary)' } } satisfies ChartConfig

const monthLabel = (month: string, pattern = 'MMM yy') => format(toDate(`${month}-01`), pattern, { locale: de })

const x = (_: MonthBalance, i: number) => i
const y = (d: MonthBalance) => d.state / 60
const xTicks = computed(() => {
  const n = history.value.length
  const step = Math.max(1, Math.ceil(n / 6))
  return history.value.map((_, i) => i).filter(i => (n - 1 - i) % step === 0)
})
const xTick = (i: number) => (history.value[i] ? monthLabel(history.value[i].month) : '')
const yTick = (h: number) => `${h > 0 ? '+' : ''}${h.toLocaleString('de-DE')} h`

// Crosshair tooltip as HTML string (Unovis); contents are only numbers/month names
function tooltip(d: MonthBalance) {
  return `<div class="grid gap-1 rounded-md border bg-popover px-2.5 py-1.5 text-xs tabular-nums">
    <div class="font-medium">${monthLabel(d.month, 'MMMM yyyy')}${d.ongoing ? ' (bis gestern)' : ''}</div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Stand</span><span>${formatBalance(d.state)}</span></div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Monat</span><span>${formatBalance(d.delta)}</span></div>
  </div>`
}

const monthsDescending = computed(() => [...history.value].reverse())
const todayState = computed(() => history.value.at(-1)?.state ?? 0)
</script>

<template>
  <Card class="gap-0 pb-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        Stundenkonto
        <NuxtLink to="/settings" class="text-[13px] font-medium text-primary hover:underline">Startsaldo</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="py-4">
      <p v-if="!history.length" class="text-sm text-muted-foreground">
        Noch kein Verlauf – das Startdatum des Stundenkontos liegt in der Zukunft.
      </p>
      <template v-else>
        <div class="text-[13px] text-muted-foreground">
          Stand heute
        </div>
        <div class="font-mono text-[32px] leading-10 font-medium tabular-nums" :class="todayState < 0 ? 'text-negativ' : todayState > 0 ? 'text-positiv' : ''">
          {{ formatBalance(todayState) }}
        </div>
        <ClientOnly>
          <ChartContainer
            :config="chartConfig"
            class="mt-3 aspect-auto h-32 [--vis-axis-grid-color:var(--border)] [--vis-axis-tick-label-color:var(--muted-foreground)] [--vis-crosshair-line-stroke-color:var(--border)] [&_.tick_text]:font-mono"
            cursor
          >
            <VisXYContainer :data="history" :margin="{ left: 4, right: 8 }">
              <VisLine :x="x" :y="y" :color="chartConfig.state.color" :line-width="2" />
              <VisScatter :x="x" :y="y" :color="chartConfig.state.color" :size="6" />
              <VisAxis type="x" :x="x" :tick-values="xTicks" :tick-format="xTick" :tick-line="false" :domain-line="false" :grid-line="false" />
              <VisAxis type="y" :num-ticks="4" :tick-format="yTick" :tick-line="false" :domain-line="false" />
              <ChartTooltip />
              <ChartCrosshair :template="tooltip" :color="chartConfig.state.color" />
            </VisXYContainer>
          </ChartContainer>
        </ClientOnly>
      </template>
    </CardContent>

    <div v-if="history.length" class="max-h-72 overflow-y-auto text-[13px]">
      <div class="sticky top-0 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-t bg-card px-4 py-2 text-xs text-muted-foreground">
        <span>Monat</span><span class="text-right">Delta</span><span class="text-right">Stand</span>
      </div>
      <div v-for="m in monthsDescending" :key="m.month" class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-t px-4 py-2">
        <span>{{ monthLabel(m.month, 'MMMM yyyy') }}<span v-if="m.ongoing" class="text-muted-foreground"> · laufend</span></span>
        <span class="text-right font-mono tabular-nums" :class="m.delta < 0 ? 'text-negativ' : m.delta > 0 ? 'text-positiv' : 'text-muted-foreground'">{{ formatBalance(m.delta) }}</span>
        <span class="text-right font-mono tabular-nums">{{ formatBalance(m.state) }}</span>
      </div>
    </div>
  </Card>
</template>
