<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight } from '@lucide/vue'

// Übersicht (Plan §5.4): gebuchte Zeit gruppiert Konto → Aufgabe → Tage mit Stunden und Anteil je Ebene
const props = defineProps<{ von: string, bis: string }>()

const { data: uebersicht } = useFetch('/api/uebersicht', {
  key: 'uebersicht',
  query: { von: toRef(props, 'von'), bis: toRef(props, 'bis') },
})

// Konten standardmäßig offen, Aufgaben (Tagesebene) zu
const zugeklappteKonten = ref(new Set<number>())
const offeneAufgaben = ref(new Set<string>())
const aufgabeKey = (kontoId: number, aufgabeId: number | null) => `${kontoId}:${aufgabeId ?? 'ohne'}`
function umschalten<T>(menge: Set<T>, wert: T) {
  if (menge.has(wert)) menge.delete(wert)
  else menge.add(wert)
}
const alleAufgabenOffen = computed(() => !!uebersicht.value?.konten.every(k => k.aufgaben.every(a => offeneAufgaben.value.has(aufgabeKey(k.kontoId, a.aufgabeId)))))
function alleUmschalten() {
  const konten = uebersicht.value?.konten ?? []
  zugeklappteKonten.value = new Set()
  offeneAufgaben.value = alleAufgabenOffen.value
    ? new Set()
    : new Set(konten.flatMap(k => k.aufgaben.map(a => aufgabeKey(k.kontoId, a.aufgabeId))))
}

const prozent = (anteil: number) => `${Math.round(anteil * 100)} %`
const breite = (anteil: number) => ({ width: `${Math.round(anteil * 100)}%` })
</script>

<template>
  <template v-if="uebersicht">
    <!-- Summe -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="rounded-lg border bg-card px-3 py-2 text-sm tabular-nums">
        Gebucht <strong>{{ formatDauer(uebersicht.gesamt) }}</strong> / Soll {{ formatDauer(uebersicht.soll) }}
        <span :class="uebersicht.gesamt - uebersicht.soll >= 0 ? 'text-positiv' : 'text-negativ'">({{ formatSaldo(uebersicht.gesamt - uebersicht.soll) }})</span>
      </div>
      <Button v-if="uebersicht.konten.length" size="sm" variant="ghost" @click="alleUmschalten">
        {{ alleAufgabenOffen ? 'Tage einklappen' : 'Alle Tage zeigen' }}
      </Button>
    </div>

    <p v-if="!uebersicht.konten.length" class="text-muted-foreground">
      Keine gebuchte Zeit in diesem Zeitraum.
    </p>

    <!-- Konto → Aufgabe → Tage -->
    <div v-else class="grid grid-cols-1 rounded-lg border bg-card text-sm tabular-nums">
      <div class="grid grid-cols-[1fr_5rem_9rem] gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
        <span>Konto / Aufgabe / Tag</span><span class="text-right">Stunden</span><span>Anteil</span>
      </div>

      <div v-for="k in uebersicht.konten" :key="k.kontoId" class="border-b last:border-b-0">
        <button
          type="button"
          class="grid w-full grid-cols-[1fr_5rem_9rem] items-center gap-3 px-3 py-2 text-left font-medium hover:bg-accent/50"
          :aria-expanded="!zugeklappteKonten.has(k.kontoId)"
          @click="umschalten(zugeklappteKonten, k.kontoId)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <ChevronRight class="size-4 shrink-0 transition-transform" :class="{ 'rotate-90': !zugeklappteKonten.has(k.kontoId) }" />
            <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
            <span class="truncate">{{ k.name }}</span>
          </span>
          <span class="text-right">{{ formatDauer(k.minuten) }}</span>
          <span class="flex items-center gap-2">
            <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span class="block h-full rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" :style="breite(k.anteil)" />
            </span>
            <span class="w-10 text-right text-xs text-muted-foreground">{{ prozent(k.anteil) }}</span>
          </span>
        </button>

        <template v-if="!zugeklappteKonten.has(k.kontoId)">
          <div v-for="a in k.aufgaben" :key="aufgabeKey(k.kontoId, a.aufgabeId)">
            <div class="grid grid-cols-[1fr_5rem_9rem] items-center gap-3 px-3 py-1.5 hover:bg-accent/30">
              <span class="flex min-w-0 items-center gap-2 pl-6">
                <button
                  type="button"
                  class="flex min-w-0 items-center gap-2 text-left"
                  :aria-expanded="offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId))"
                  @click="umschalten(offeneAufgaben, aufgabeKey(k.kontoId, a.aufgabeId))"
                >
                  <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId)) }" />
                  <span v-if="a.aufgabeId == null" class="truncate italic text-muted-foreground">ohne Aufgabe</span>
                  <template v-else>
                    <AufgabeKey v-if="a.key" :wert="a.key" :farbe="k.farbe" />
                    <span class="truncate" :title="a.titel ?? undefined">{{ a.titel }}</span>
                  </template>
                </button>
                <NuxtLink v-if="a.aufgabeId != null" :to="`/aufgaben/${a.aufgabeId}`" class="shrink-0 text-xs text-muted-foreground hover:underline">
                  öffnen
                </NuxtLink>
              </span>
              <span class="text-right">{{ formatDauer(a.minuten) }}</span>
              <span class="flex items-center gap-2">
                <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span class="block h-full rounded-full bg-muted-foreground/60" :style="breite(a.anteil)" />
                </span>
                <span class="w-10 text-right text-xs text-muted-foreground">{{ prozent(a.anteil) }}</span>
              </span>
            </div>

            <template v-if="offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId))">
              <div v-for="t in a.tage" :key="t.datum" class="grid grid-cols-[1fr_5rem_9rem] gap-3 px-3 py-1 text-muted-foreground">
                <span class="min-w-0 pl-18">
                  <NuxtLink :to="t.datum === heute() ? '/' : `/?datum=${t.datum}`" class="text-foreground hover:underline">
                    {{ format(zuDate(t.datum), 'EEE d.M.yyyy', { locale: de }) }}
                  </NuxtLink>
                  <span v-if="t.notizen.length" class="ml-2 text-xs">{{ t.notizen.join(' · ') }}</span>
                </span>
                <span class="text-right">{{ formatDauer(t.minuten) }}</span>
                <span class="pr-12 text-right text-xs">{{ prozent(t.anteil) }}</span>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </template>
</template>
