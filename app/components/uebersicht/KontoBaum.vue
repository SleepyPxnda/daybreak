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
    <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Gebucht
        </div>
        <div class="font-mono text-2xl font-medium tabular-nums">
          {{ formatDauer(uebersicht.gesamt) }}
        </div>
      </div>
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Soll
        </div>
        <div class="font-mono text-2xl font-medium text-muted-foreground tabular-nums">
          {{ formatDauer(uebersicht.soll) }}
        </div>
      </div>
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Differenz
        </div>
        <div class="font-mono text-2xl font-medium tabular-nums" :class="uebersicht.gesamt - uebersicht.soll >= 0 ? 'text-positiv' : 'text-negativ'">
          {{ formatSaldo(uebersicht.gesamt - uebersicht.soll) }}
        </div>
      </div>
    </div>

    <p v-if="!uebersicht.konten.length" class="text-sm text-muted-foreground">
      Keine gebuchte Zeit in diesem Zeitraum.
    </p>

    <!-- Konto → Aufgabe → Tage -->
    <section v-else class="min-w-0 overflow-hidden rounded-xl border bg-background text-sm">
      <div class="grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card px-4 text-xs text-muted-foreground">
        <span class="flex items-center justify-between gap-2">
          Konto / Aufgabe
          <Button size="sm" variant="ghost" class="-mr-2 h-7 text-xs" @click="alleUmschalten">
            {{ alleAufgabenOffen ? 'Tage einklappen' : 'Alle Tage zeigen' }}
          </Button>
        </span>
        <span class="text-right">Stunden</span><span>Anteil</span>
      </div>

      <div v-for="k in uebersicht.konten" :key="k.kontoId">
        <button
          type="button"
          class="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b px-4 text-left hover:bg-raised"
          :aria-expanded="!zugeklappteKonten.has(k.kontoId)"
          @click="umschalten(zugeklappteKonten, k.kontoId)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': !zugeklappteKonten.has(k.kontoId) }" />
            <span class="size-2 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
            <span class="truncate font-semibold">{{ k.name }}</span>
          </span>
          <span class="text-right font-mono tabular-nums">{{ formatDauer(k.minuten) }}</span>
          <span class="flex items-center gap-2">
            <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span class="block h-full rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" :style="breite(k.anteil)" />
            </span>
            <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ prozent(k.anteil) }}</span>
          </span>
        </button>

        <template v-if="!zugeklappteKonten.has(k.kontoId)">
          <div v-for="a in k.aufgaben" :key="aufgabeKey(k.kontoId, a.aufgabeId)">
            <div class="grid min-h-11 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 hover:bg-raised">
              <span class="flex min-w-0 items-center gap-2 pl-6">
                <button
                  type="button"
                  class="flex min-w-0 items-center gap-2 text-left"
                  :aria-expanded="offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId))"
                  @click="umschalten(offeneAufgaben, aufgabeKey(k.kontoId, a.aufgabeId))"
                >
                  <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId)) }" />
                  <span v-if="a.aufgabeId == null" class="truncate text-muted-foreground italic">ohne Aufgabe</span>
                  <template v-else>
                    <AufgabeKey v-if="a.key" :wert="a.key" />
                    <span class="truncate" :title="a.titel ?? undefined">{{ a.titel }}</span>
                  </template>
                </button>
                <NuxtLink v-if="a.aufgabeId != null" :to="`/aufgaben/${a.aufgabeId}`" class="shrink-0 text-xs text-muted-foreground hover:text-primary">
                  öffnen
                </NuxtLink>
              </span>
              <span class="text-right font-mono tabular-nums">{{ formatDauer(a.minuten) }}</span>
              <span class="flex items-center gap-2">
                <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span class="block h-full rounded-full bg-muted-foreground" :style="breite(a.anteil)" />
                </span>
                <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ prozent(a.anteil) }}</span>
              </span>
            </div>

            <template v-if="offeneAufgaben.has(aufgabeKey(k.kontoId, a.aufgabeId))">
              <div v-for="t in a.tage" :key="t.datum" class="grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 text-[13px] text-muted-foreground">
                <span class="min-w-0 truncate pl-18">
                  <NuxtLink :to="t.datum === heute() ? '/' : `/?datum=${t.datum}`" class="text-foreground hover:text-primary">
                    {{ format(zuDate(t.datum), 'EEE d.M.yyyy', { locale: de }) }}
                  </NuxtLink>
                  <span v-if="t.notizen.length" class="ml-2 text-xs">{{ t.notizen.join(' · ') }}</span>
                </span>
                <span class="text-right font-mono tabular-nums">{{ formatDauer(t.minuten) }}</span>
                <span class="text-right font-mono text-xs tabular-nums">{{ prozent(t.anteil) }}</span>
              </div>
            </template>
          </div>
        </template>
      </div>
    </section>
  </template>
</template>
