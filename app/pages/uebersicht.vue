<script setup lang="ts">
import { addMonths, endOfISOWeek, endOfMonth, format, getISOWeek, startOfISOWeek, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import KontoBaum from '~/components/uebersicht/KontoBaum.vue'
import MonatsAbschluss from '~/components/uebersicht/MonatsAbschluss.vue'
import SaldoVerlauf from '~/components/widgets/SaldoVerlauf.vue'

// Übersicht (Plan §5.4): Zeitraum wählen, gebuchte Zeit gruppiert Konto → Aufgabe → Tage, Monatsabschluss, Stundenkonto-Verlauf
useHead({ title: 'Übersicht · daybreak' })

type Modus = 'woche' | 'monat' | 'frei' | 'abschluss'
const MODI: { modus: Modus, label: string }[] = [
  { modus: 'woche', label: 'Woche' },
  { modus: 'monat', label: 'Monat' },
  { modus: 'frei', label: 'Frei' },
  { modus: 'abschluss', label: 'Monatsabschluss' },
]

const route = useRoute()
const modus = computed<Modus>(() => (['woche', 'frei', 'abschluss'].includes(String(route.query.modus)) ? route.query.modus as Modus : 'monat'))
const anker = computed(() => {
  const d = String(route.query.datum ?? '')
  return zuDate(istDatum(d) ? d : heute())
})

const zeitraum = computed(() => {
  if (modus.value === 'woche') return { von: zuDatum(startOfISOWeek(anker.value)), bis: zuDatum(endOfISOWeek(anker.value)) }
  if (modus.value !== 'frei') return { von: zuDatum(startOfMonth(anker.value)), bis: zuDatum(endOfMonth(anker.value)) }
  const von = String(route.query.von ?? '')
  const bis = String(route.query.bis ?? '')
  return {
    von: istDatum(von) ? von : zuDatum(startOfMonth(new Date())),
    bis: istDatum(bis) ? bis : heute(),
  }
})
const zeitraumFehler = computed(() => {
  const { von, bis } = zeitraum.value
  if (von > bis) return '„Von“ muss vor „Bis“ liegen.'
  if (tageZwischen(von, bis) > 366) return 'Höchstens ein Jahr auswählen.'
  return ''
})

const titel = computed(() => {
  const { von, bis } = zeitraum.value
  if (modus.value === 'woche') return `KW ${getISOWeek(zuDate(von))} · ${format(zuDate(von), 'd. MMM', { locale: de })} – ${format(zuDate(bis), 'd. MMM yyyy', { locale: de })}`
  if (modus.value !== 'frei') return format(zuDate(von), 'MMMM yyyy', { locale: de })
  return `${format(zuDate(von), 'd. MMM yyyy', { locale: de })} – ${format(zuDate(bis), 'd. MMM yyyy', { locale: de })}`
})

function setzeQuery(teil: Record<string, string | undefined>) {
  navigateTo({ query: { ...route.query, ...teil } }, { replace: true })
}
function modusWechseln(neu: Modus) {
  // Freier Zeitraum startet mit dem aktuell angezeigten
  if (neu === 'frei') setzeQuery({ modus: neu, datum: undefined, von: zeitraum.value.von, bis: zeitraum.value.bis })
  else setzeQuery({ modus: neu, von: undefined, bis: undefined })
}
function blaettern(richtung: number) {
  const ziel = modus.value === 'woche' ? plusTage(zuDatum(anker.value), richtung * 7) : zuDatum(addMonths(anker.value, richtung))
  setzeQuery({ datum: ziel })
}
</script>

<template>
  <div class="grid gap-8 xl:grid-cols-[1fr_22rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-6">
      <!-- Kopf: Zeitraum -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <template v-if="modus !== 'frei'">
            <Button size="icon" variant="ghost" :aria-label="modus === 'woche' ? 'Vorherige Woche' : 'Vorheriger Monat'" @click="blaettern(-1)">
              <ChevronLeft />
            </Button>
            <h1 class="w-72 shrink-0 text-center text-2xl font-semibold tracking-tight">
              {{ titel }}
            </h1>
            <Button size="icon" variant="ghost" :aria-label="modus === 'woche' ? 'Nächste Woche' : 'Nächster Monat'" @click="blaettern(1)">
              <ChevronRight />
            </Button>
          </template>
          <template v-else>
            <h1 class="text-2xl font-semibold tracking-tight">
              Übersicht
            </h1>
            <Input type="date" class="w-40" aria-label="Von" :model-value="zeitraum.von" @change="setzeQuery({ von: ($event.target as HTMLInputElement).value || undefined })" />
            <span class="text-muted-foreground">–</span>
            <Input type="date" class="w-40" aria-label="Bis" :model-value="zeitraum.bis" @change="setzeQuery({ bis: ($event.target as HTMLInputElement).value || undefined })" />
          </template>
        </div>
        <div class="inline-flex gap-0.5 rounded-md border bg-raised p-[3px]" role="group" aria-label="Zeitraum">
          <button
            v-for="m in MODI"
            :key="m.modus"
            type="button"
            class="h-[30px] rounded-[6px] px-3 text-[13px] font-medium transition-colors"
            :class="modus === m.modus ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="modus === m.modus"
            @click="modusWechseln(m.modus)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <p v-if="zeitraumFehler" class="text-sm text-negativ">
        {{ zeitraumFehler }}
      </p>
      <MonatsAbschluss v-else-if="modus === 'abschluss'" :von="zeitraum.von" :bis="zeitraum.bis" />
      <KontoBaum v-else :von="zeitraum.von" :bis="zeitraum.bis" />
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <SaldoVerlauf />
    </aside>
  </div>
</template>
