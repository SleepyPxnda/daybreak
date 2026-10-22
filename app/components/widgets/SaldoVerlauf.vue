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
  return `<div class="grid gap-1 rounded-md border bg-popover px-2.5 py-1.5 text-xs tabular-nums">
    <div class="font-medium">${monatLabel(d.monat, 'MMMM yyyy')}${d.laufend ? ' (bis gestern)' : ''}</div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Stand</span><span>${formatSaldo(d.stand)}</span></div>
    <div class="flex justify-between gap-4"><span class="text-muted-foreground">Monat</span><span>${formatSaldo(d.delta)}</span></div>
  </div>`
}

const monateAbsteigend = computed(() => [...verlauf.value].reverse())
const standHeute = computed(() => verlauf.value.at(-1)?.stand ?? 0)
</script>

<template>
  <Card class="gap-0 pb-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        Stundenkonto
        <NuxtLink to="/einstellungen" class="text-[13px] font-medium text-primary hover:underline">Startsaldo</NuxtLink>
      </CardTitle>
    </CardHeader>
    <CardContent class="py-4">
      <p v-if="!verlauf.length" class="text-sm text-muted-foreground">
        Noch kein Verlauf – das Startdatum des Stundenkontos liegt in der Zukunft.
      </p>
      <template v-else>
        <div class="text-[13px] text-muted-foreground">
          Stand heute
        </div>
        <div class="font-mono text-[32px] leading-10 font-medium tabular-nums" :class="standHeute < 0 ? 'text-negativ' : standHeute > 0 ? 'text-positiv' : ''">
          {{ formatSaldo(standHeute) }}
        </div>
        <ClientOnly>
          <ChartContainer
            :config="chartConfig"
            class="mt-3 aspect-auto h-32 [--vis-axis-grid-color:var(--border)] [--vis-axis-tick-label-color:var(--muted-foreground)] [--vis-crosshair-line-stroke-color:var(--border)] [&_.tick_text]:font-mono"
            cursor
          >
            <VisXYContainer :data="verlauf" :margin="{ left: 4, right: 8 }">
              <VisLine :x="x" :y="y" :color="chartConfig.stand.color" :line-width="2" />
              <VisScatter :x="x" :y="y" :color="chartConfig.stand.color" :size="6" />
              <VisAxis type="x" :x="x" :tick-values="xTicks" :tick-format="xTick" :tick-line="false" :domain-line="false" :grid-line="false" />
              <VisAxis type="y" :num-ticks="4" :tick-format="yTick" :tick-line="false" :domain-line="false" />
              <ChartTooltip />
              <ChartCrosshair :template="tooltip" :color="chartConfig.stand.color" />
            </VisXYContainer>
          </ChartContainer>
        </ClientOnly>
      </template>
    </CardContent>

    <div v-if="verlauf.length" class="max-h-72 overflow-y-auto text-[13px]">
      <div class="sticky top-0 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-t bg-card px-4 py-2 text-xs text-muted-foreground">
        <span>Monat</span><span class="text-right">Delta</span><span class="text-right">Stand</span>
      </div>
      <div v-for="m in monateAbsteigend" :key="m.monat" class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-t px-4 py-2">
        <span>{{ monatLabel(m.monat, 'MMMM yyyy') }}<span v-if="m.laufend" class="text-muted-foreground"> · laufend</span></span>
        <span class="text-right font-mono tabular-nums" :class="m.delta < 0 ? 'text-negativ' : m.delta > 0 ? 'text-positiv' : 'text-muted-foreground'">{{ formatSaldo(m.delta) }}</span>
        <span class="text-right font-mono tabular-nums">{{ formatSaldo(m.stand) }}</span>
      </div>
    </div>
  </Card>
</template>
