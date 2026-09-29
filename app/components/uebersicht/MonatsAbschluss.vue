<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// Monatsabschluss: Tag für Tag Start, Ende, Pause, Ist/Soll und gebuchte Zeit je Konto mit Keys – zum Übertragen ins Firmentool
const props = defineProps<{ von: string, bis: string }>()

const { data: tage } = useFetch('/api/uebersicht/abschluss', {
  key: 'monatsabschluss',
  query: { von: toRef(props, 'von'), bis: toRef(props, 'bis') },
  default: () => [],
})

const TYP_LABEL: Record<string, string> = { urlaub: 'Urlaub', halb_urlaub: '½ Urlaub', krank: 'Krank', gleittag: 'Gleittag' }
function tagLabel(t: { feiertag?: string, typ: string, istArbeitstag: boolean }) {
  if (t.feiertag) return t.feiertag
  if (t.istArbeitstag && t.typ !== 'arbeit') return TYP_LABEL[t.typ]
  return undefined
}

// Freie Tage ohne Buchung (Wochenende) ausblenden; Feiertage und Abwesenheiten bleiben sichtbar
const sichtbareTage = computed(() => tage.value.filter(t => t.ist || t.soll || tagLabel(t)))
const heuteDatum = heute()

const summe = computed(() => {
  const konten = new Map<number, { kontoId: number, name: string, farbe: string | null, minuten: number }>()
  for (const k of tage.value.flatMap(t => t.konten)) {
    const s = konten.get(k.kontoId) ?? { kontoId: k.kontoId, name: k.name, farbe: k.farbe, minuten: 0 }
    s.minuten += k.minuten
    konten.set(k.kontoId, s)
  }
  return {
    ist: tage.value.reduce((s, t) => s + t.ist, 0),
    soll: tage.value.reduce((s, t) => s + t.soll, 0),
    pause: tage.value.reduce((s, t) => s + t.pause, 0),
    konten: [...konten.values()].sort((a, b) => b.minuten - a.minuten),
  }
})

const uhrzeit = (min: number | null) => (min == null ? '–' : formatUhrzeit(min))

// Dauern wahlweise als h:mm oder Dezimalstunden (1:15 → 1,25) fürs Firmentool; Start/Ende bleiben Uhrzeiten
const dezimal = useCookie<boolean>('daybreak-abschluss-dezimal', { default: () => false, maxAge: 60 * 60 * 24 * 365 })
const dauer = (min: number) => (dezimal.value ? formatDezimal(min) : formatDauer(min))
</script>

<template>
  <!-- Monatssumme -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="rounded-lg border bg-card px-3 py-2 text-sm tabular-nums">
      Gebucht <strong>{{ dauer(summe.ist) }}</strong> / Soll {{ dauer(summe.soll) }}
      <span :class="summe.ist - summe.soll >= 0 ? 'text-positiv' : 'text-negativ'">({{ formatSaldo(summe.ist - summe.soll, dauer) }})</span>
      <span class="text-muted-foreground"> · Pausen {{ dauer(summe.pause) }}</span>
    </div>
    <div class="flex gap-1 rounded-lg border bg-card p-1" role="group" aria-label="Darstellung der Dauer">
      <Button size="sm" :variant="dezimal ? 'ghost' : 'secondary'" :aria-pressed="!dezimal" @click="dezimal = false">
        h:mm
      </Button>
      <Button size="sm" :variant="dezimal ? 'secondary' : 'ghost'" :aria-pressed="dezimal" @click="dezimal = true">
        Dezimal
      </Button>
    </div>
  </div>

  <div class="grid grid-cols-1 rounded-lg border bg-card text-sm tabular-nums">
    <div class="grid grid-cols-[9rem_7.5rem_5rem_1fr_7rem] gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
      <span>Tag</span><span>Start – Ende</span><span class="text-right">Pause</span><span /><span class="text-right">Ist / Soll</span>
    </div>

    <div
      v-for="t in sichtbareTage"
      :key="t.datum"
      class="grid gap-1 border-b px-3 py-2 last:border-b-0"
      :class="{ 'opacity-60': t.datum > heuteDatum }"
    >
      <div class="grid grid-cols-[9rem_7.5rem_5rem_1fr_7rem] items-baseline gap-3">
        <NuxtLink :to="t.datum === heuteDatum ? '/' : `/?datum=${t.datum}`" class="font-medium hover:underline">
          {{ format(zuDate(t.datum), 'EEE d.M.', { locale: de }) }}
        </NuxtLink>
        <span>{{ uhrzeit(t.start) }} – {{ uhrzeit(t.ende) }}</span>
        <span class="text-right">{{ t.start == null ? '–' : dauer(t.pause) }}</span>
        <span class="flex min-w-0 flex-wrap items-baseline gap-2">
          <Badge v-if="tagLabel(t)" variant="secondary">{{ tagLabel(t) }}</Badge>
          <span v-if="!t.ist && t.soll && t.datum < heuteDatum" class="text-xs text-negativ">keine Buchung</span>
          <span v-if="t.notiz" class="truncate text-xs text-muted-foreground">{{ t.notiz }}</span>
        </span>
        <span class="text-right">
          <strong>{{ dauer(t.ist) }}</strong><span class="text-muted-foreground"> / {{ dauer(t.soll) }}</span>
        </span>
      </div>

      <div
        v-for="k in t.konten"
        :key="k.kontoId"
        class="grid grid-cols-[9rem_7.5rem_5rem_1fr_7rem] items-baseline gap-3 text-muted-foreground"
      >
        <span class="col-span-2 flex min-w-0 items-center gap-2 pl-3 text-foreground">
          <span class="size-2 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
          <span class="truncate">{{ k.name }}</span>
        </span>
        <span class="text-right text-foreground">{{ dauer(k.minuten) }}</span>
        <span class="col-span-2 min-w-0 truncate" :title="k.bezeichnungen.join(', ')">{{ k.bezeichnungen.join(', ') }}</span>
      </div>
    </div>

    <!-- Monatssumme je Konto -->
    <div v-if="summe.konten.length" class="grid gap-1 border-t bg-muted/30 px-3 py-2">
      <span class="text-xs text-muted-foreground">Monat je Konto</span>
      <div v-for="k in summe.konten" :key="k.kontoId" class="grid grid-cols-[9rem_7.5rem_5rem_1fr_7rem] items-baseline gap-3">
        <span class="col-span-2 flex min-w-0 items-center gap-2 pl-3">
          <span class="size-2 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
          <span class="truncate">{{ k.name }}</span>
        </span>
        <span class="text-right font-medium">{{ dauer(k.minuten) }}</span>
      </div>
    </div>
  </div>
</template>
