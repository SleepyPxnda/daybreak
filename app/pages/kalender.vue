<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useEventListener } from '@vueuse/core'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import type { TagTyp } from '#shared/utils/soll'
import MiniMonat from '~/components/kalender/MiniMonat.vue'
import UrlaubCard from '~/components/widgets/UrlaubCard.vue'

// Kalender (Plan §5.5): Jahresansicht, Feiertage BW, Abwesenheiten; Range-Auswahl → Tagestyp setzen
const route = useRoute()
const aktuellesJahr = Number(heute().slice(0, 4))
const jahr = computed(() => Number(route.query.jahr) || aktuellesJahr)

useHead({ title: () => `Kalender ${jahr.value} · daybreak` })

const { data: tage } = useFetch('/api/tage', {
  key: 'kalender-tage',
  query: { von: computed(() => `${jahr.value}-01-01`), bis: computed(() => `${jahr.value}-12-31`) },
  default: () => [],
})
const infos = computed(() => new Map(tage.value.map(t => [t.datum, t])))

function jahrWechseln(delta: number) {
  const ziel = jahr.value + delta
  auswahl.value = null
  navigateTo({ query: ziel === aktuellesJahr ? {} : { jahr: ziel } })
}

// --- Bereichsauswahl per Klick/Ziehen -------------------------------------
const anker = ref<string | null>(null)
const ende = ref<string | null>(null)
const ziehtGerade = ref(false)
const auswahl = computed({
  get: () => (anker.value && ende.value
    ? { von: anker.value < ende.value ? anker.value : ende.value, bis: anker.value < ende.value ? ende.value : anker.value }
    : null),
  set: (wert: null) => {
    anker.value = wert
    ende.value = wert
  },
})

function start(datum: string) {
  anker.value = datum
  ende.value = datum
  ziehtGerade.value = true
}
function erweitern(datum: string) {
  if (ziehtGerade.value) ende.value = datum
}
useEventListener('pointerup', () => { ziehtGerade.value = false })
useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') auswahl.value = null
})

const auswahlText = computed(() => {
  const a = auswahl.value
  if (!a) return ''
  const f = (d: string) => format(zuDate(d), 'EEE d. MMM', { locale: de })
  return a.von === a.bis ? f(a.von) : `${f(a.von)} – ${f(a.bis)}`
})
const arbeitstageAuswahl = computed(() => {
  const a = auswahl.value
  if (!a) return []
  return datumsBereich(a.von, a.bis).filter(d => infos.value.get(d)?.istArbeitstag)
})
const arbeitstageInAuswahl = computed(() => arbeitstageAuswahl.value.length)
// Blocker: Hinweis „hier keinen Urlaub nehmen“ – eigener Schalter, unabhängig vom Tagestyp
const blockerInAuswahl = computed(() => arbeitstageAuswahl.value.filter(d => infos.value.get(d)?.blocker).length)
const alleBlockiert = computed(() => arbeitstageInAuswahl.value > 0 && blockerInAuswahl.value === arbeitstageInAuswahl.value)

async function blockerSetzen() {
  const a = auswahl.value
  if (!a) return
  const ok = await aktion(() => api('/api/tage/bereich', { method: 'PUT', body: { ...a, blocker: !alleBlockiert.value } }), TAG_KEYS)
  if (ok) auswahl.value = null
}

const TYPEN: { typ: TagTyp, label: string }[] = [
  { typ: 'urlaub', label: 'Urlaub' },
  { typ: 'halb_urlaub', label: '½ Urlaub' },
  { typ: 'krank', label: 'Krank' },
  { typ: 'gleittag', label: 'Gleittag' },
  { typ: 'arbeit', label: 'Zurücksetzen' },
]

async function setzen(typ: TagTyp) {
  const a = auswahl.value
  if (!a) return
  const ok = await aktion(() => api('/api/tage/bereich', { method: 'PUT', body: { ...a, typ } }), TAG_KEYS)
  if (ok) auswahl.value = null
}
</script>

<template>
  <div class="grid gap-8 xl:grid-cols-[1fr_18rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Vorheriges Jahr" @click="jahrWechseln(-1)">
            <ChevronLeft />
          </Button>
          <h1 class="w-20 text-center font-mono text-2xl font-medium tracking-tight tabular-nums">
            {{ jahr }}
          </h1>
          <Button size="icon" variant="ghost" aria-label="Nächstes Jahr" @click="jahrWechseln(1)">
            <ChevronRight />
          </Button>
        </div>
        <!-- Legende -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-konto-mint/35 ring-1 ring-konto-mint ring-inset" /> Urlaub</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-[linear-gradient(135deg,color-mix(in_oklch,var(--konto-mint)_35%,transparent)_50%,transparent_50%)] ring-1 ring-konto-mint ring-inset" /> ½ Urlaub</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm border border-dashed border-konto-mint" /> unbestätigt</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-konto-pfirsich/35 ring-1 ring-konto-pfirsich ring-inset" /> Krank</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-konto-himmel/35 ring-1 ring-konto-himmel ring-inset" /> Gleittag</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm ring-1 ring-muted-foreground ring-inset" /> Feiertag</span>
          <span class="flex items-center gap-1.5"><span class="blocker-schraffur size-3 rounded-sm" /> Blocker</span>
          <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-primary" /> Soll abweichend</span>
        </div>
      </div>

      <!-- Aktionsleiste für die Auswahl -->
      <div class="sticky top-2 z-10 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border bg-popover py-2 pr-2 pl-4 text-sm">
        <template v-if="auswahl">
          <span class="font-semibold">{{ auswahlText }}</span>
          <span class="font-mono text-[13px] text-muted-foreground">{{ arbeitstageInAuswahl }} Arbeitstag{{ arbeitstageInAuswahl === 1 ? '' : 'e' }}</span>
          <span v-if="blockerInAuswahl" class="flex items-center gap-1.5 text-[13px] text-negativ">
            <span class="blocker-schraffur size-3 rounded-sm" />
            {{ blockerInAuswahl }} Blocker-Tag{{ blockerInAuswahl === 1 ? '' : 'e' }} – hier besser kein Urlaub
          </span>
          <span class="flex-1" />
          <Button
            v-for="t in TYPEN"
            :key="t.typ"
            size="sm"
            :variant="t.typ === 'urlaub' ? 'default' : t.typ === 'arbeit' ? 'ghost' : 'outline'"
            @click="setzen(t.typ)"
          >
            {{ t.label }}
          </Button>
          <Button size="sm" variant="outline" :disabled="!arbeitstageInAuswahl" @click="blockerSetzen">
            <span class="blocker-schraffur size-3 rounded-sm" />
            {{ alleBlockiert ? 'Blocker entfernen' : 'Blocker' }}
          </Button>
          <Button v-if="auswahl.von === auswahl.bis" size="sm" variant="ghost" @click="navigateTo(`/?datum=${auswahl.von}`)">
            Tag öffnen
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Auswahl aufheben" @click="auswahl = null">
            <X />
          </Button>
        </template>
        <span v-else class="text-muted-foreground">Tag anklicken oder über mehrere Tage ziehen, um Urlaub, Krank, Gleittag oder einen Blocker zu setzen.</span>
      </div>

      <div class="grid grid-cols-2 gap-x-7 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">
        <MiniMonat
          v-for="m in 12"
          :key="m"
          :jahr="jahr"
          :monat="m"
          :infos="infos"
          :auswahl="auswahl"
          @start="start"
          @erweitern="erweitern"
        />
      </div>
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <UrlaubCard :jahr="jahr" />
    </aside>
  </div>
</template>
