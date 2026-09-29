<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { VisAxis, VisLine, VisScatter, VisXYContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import { ChartContainer, ChartCrosshair, ChartTooltip } from '@/components/ui/chart'
import type { MonatsSaldo } from '#shared/utils/saldo'

// Stundenkonto-Verlauf (Plan §5.4): Kontostand am Monatsende als Linie, darunter Monatsdelta + Stand
const { data: verlauf } = useFetch('/api/saldo/verlauf', { key: 'saldo-verlauf', default: () => [] as MonatsSaldo[] })

const chartConfig = { stand: { label: 'Kontostand', color: 'var(--primary)' } } satisfies ChartConfig

const monatLabel = (monat: string, muster = 'MMM yy') => format(zuDate(`${monat}-01`), muster, { locale: de })

const x = (_: MonatsSaldo, i: number) => i
const y = (d: MonatsSaldo) => d.stand / 60
const xTicks = computed(() => {
  const n = verlauf.value.length
  const schritt = Math.max(1, Math.ceil(n / 6))
  return verlauf.value.map((_, i) => i).filter(i => (n - 1 - i) % schritt === 0)
})
const xTick = (i: number) => (verlauf.value[i] ? monatLabel(verlauf.value[i].monat) : '')
const yTick = (h: number) => `${h > 0 ? '+' : ''}${h.toLocaleString('de-DE')} h`

// Crosshair-Tooltip als HTML-String (Unovis); Inhalte sind nur Zahlen/Monatsnamen
function tooltip(d: MonatsSaldo) {
  return `<div class="grid gap-1 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-xl tabular-nums">
    <div class="font-medium">${monatLabel(d.monat, 'MMMM yyyy')}${d.laufend ? ' (bis gestern)' : ''}</div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Stand</span><span>${formatSaldo(d.stand)}</span></div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Monat</span><span>${formatSaldo(d.delta)}</span></div>
  </div>`
}

const monateAbsteigend = computed(() => [...verlauf.value].reverse())
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-baseline justify-between">
        Stundenkonto
        <NuxtLink to="/einstellungen" class="text-xs font-normal text-muted-foreground hover:underline">Startsaldo</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-4">
      <p v-if="!verlauf.length" class="text-sm text-muted-foreground">
        Noch kein Verlauf – das Startdatum des Stundenkontos liegt in der Zukunft.
      </p>
      <template v-else>
        <ClientOnly>
          <ChartContainer :config="chartConfig" class="aspect-auto h-48" cursor>
            <VisXYContainer :data="verlauf" :margin="{ left: 4, right: 8 }">
              <VisLine :x="x" :y="y" :color="chartConfig.stand.color" />
              <VisScatter :x="x" :y="y" :color="chartConfig.stand.color" :size="5" />
              <VisAxis type="x" :x="x" :tick-values="xTicks" :tick-format="xTick" :tick-line="false" :domain-line="false" :grid-line="false" />
              <VisAxis type="y" :num-ticks="4" :tick-format="yTick" :tick-line="false" :domain-line="false" />
              <ChartTooltip />
              <ChartCrosshair :template="tooltip" :color="chartConfig.stand.color" />
            </VisXYContainer>
          </ChartContainer>
        </ClientOnly>

        <div class="grid max-h-64 gap-0.5 overflow-y-auto text-sm tabular-nums">
          <div class="grid grid-cols-[1fr_4rem_4rem] gap-x-4 text-xs text-muted-foreground">
            <span>Monat</span><span class="text-right">Delta</span><span class="text-right">Stand</span>
          </div>
          <div v-for="m in monateAbsteigend" :key="m.monat" class="grid grid-cols-[1fr_4rem_4rem] gap-x-4">
            <span>{{ monatLabel(m.monat, 'MMMM yyyy') }}<span v-if="m.laufend" class="text-muted-foreground"> · laufend</span></span>
            <span class="text-right" :class="m.delta < 0 ? 'text-negativ' : m.delta > 0 ? 'text-positiv' : 'text-muted-foreground'">{{ formatSaldo(m.delta) }}</span>
            <span class="text-right font-medium">{{ formatSaldo(m.stand) }}</span>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
