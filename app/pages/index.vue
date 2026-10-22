<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ClipboardCheck, Copy, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import QuickInput from '~/components/quick-input/QuickInput.vue'
import TagEinstellung from '~/components/widgets/TagEinstellung.vue'
import AufgabenInArbeit from '~/components/widgets/AufgabenInArbeit.vue'
import TodoSpalte from '~/components/widgets/TodoSpalte.vue'
import AngepinnteNotizen from '~/components/widgets/AngepinnteNotizen.vue'
import NaechsterUrlaub from '~/components/widgets/NaechsterUrlaub.vue'

const route = useRoute()
const datum = computed(() => {
  const d = String(route.query.datum ?? '')
  return istDatum(d) ? d : heute()
})
const istHeute = computed(() => datum.value === heute())

useHead({ title: () => `${istHeute.value ? 'Heute' : format(zuDate(datum.value), 'EEE d. MMM', { locale: de })} · daybreak` })

const { data: einstellungen } = useEinstellungen()
const { bloecke, konflikte, info } = useTag(datum)

const von = computed(() => einstellungen.value?.timelineVon ?? 420)
const bis = computed(() => einstellungen.value?.timelineBis ?? 1140)

const {
  jetzt,
  blockDialog,
  bearbeiteterBlock,
  entwurf,
  vorlageDialog,
  vorlageEntwurf,
  anlegen,
  oeffnen,
  aendern,
  menue,
  ablegen,
  ablegenMerker,
} = useBlockBearbeitung()

const ist = computed(() => istMinuten(bloecke.value))
const geplant = computed(() => geplantMinuten(bloecke.value))
const soll = computed(() => info.value?.soll ?? 0)
const fortschritt = computed(() => (soll.value ? Math.min(100, Math.round((ist.value / soll.value) * 100)) : 0))

function tagWechseln(tage: number) {
  const ziel = plusTage(datum.value, tage)
  navigateTo({ query: ziel === heute() ? {} : { datum: ziel } })
}

// --- Wie gestern / Tagesabschluss --------------------------------------
async function wieGestern() {
  const r = await aktion(() => api<{ quelle: string | null, angelegt: unknown[], uebersprungen: number }>(
    '/api/blocks/wie-gestern', { method: 'POST', body: { datum: datum.value } },
  ), TAG_KEYS)
  if (!r) return
  if (!r.quelle) return void toast.info('Keine gebuchten Blöcke in den letzten 7 Tagen gefunden.')
  toast.success(`${r.angelegt.length} Blöcke vom ${format(zuDate(r.quelle), 'EEE d.M.', { locale: de })} als geplant übernommen${r.uebersprungen ? ` (${r.uebersprungen} übersprungen – Zeit belegt)` : ''}.`)
}

const abschluss = ref(false)
// Klick auf die Feierabend-Erinnerung öffnet den Tagesabschluss über ?abschluss=1
watch(() => route.query.abschluss, (wert) => {
  if (wert === undefined) return
  abschluss.value = true
  navigateTo({ query: {} }, { replace: true })
}, { immediate: true })
</script>

<template>
  <div class="grid gap-6">
    <!-- Kopf -->
    <div class="flex flex-wrap items-center gap-3">
      <Button size="icon" variant="ghost" aria-label="Vorheriger Tag" @click="tagWechseln(-1)">
        <ChevronLeft />
      </Button>
      <!-- Feste Breite, damit die Pfeile beim Blättern nicht springen (längstes Datum passt rein) -->
      <div class="w-60 shrink-0">
        <h1 class="truncate text-2xl font-semibold tracking-tight">
          {{ istHeute ? 'Heute' : format(zuDate(datum), 'EEEE', { locale: de }) }}
        </h1>
        <p class="truncate text-sm text-muted-foreground">
          {{ format(zuDate(datum), 'EEEE, d. MMMM yyyy', { locale: de }) }}
        </p>
      </div>
      <Button size="icon" variant="ghost" aria-label="Nächster Tag" @click="tagWechseln(1)">
        <ChevronRight />
      </Button>
      <!-- Immer im Layout, nur unsichtbar – sonst verschiebt sich der Rest -->
      <Button size="sm" variant="ghost" :class="{ invisible: istHeute }" :tabindex="istHeute ? -1 : 0" @click="navigateTo({ query: {} })">
        Heute
      </Button>
      <div class="grow" />
      <TagEinstellung
        v-if="info"
        :datum="datum"
        :typ="info.typ"
        :soll="info.soll"
        :feiertag="info.feiertag"
        :ist-arbeitstag="info.istArbeitstag"
        :notiz="info.notiz"
      />
    </div>

    <div v-if="konflikte.length" class="flex flex-wrap gap-3">
      <NaechsterUrlaub darstellung="banner" class="flex-[1_1_420px]" />
      <div class="flex items-center gap-2.5 rounded-xl border bg-warnung-subtle px-4 py-2.5 text-sm">
        <TriangleAlert class="size-[18px] shrink-0 text-warnung" />
        <span>
          <span class="font-semibold text-warnung">{{ konflikte.length }} wiederkehrende{{ konflikte.length === 1 ? 'r Block' : ' Blöcke' }}</span>
          nicht eingetragen – Zeitraum belegt
        </span>
      </div>
    </div>
    <NaechsterUrlaub v-else darstellung="banner" />

    <!-- Zeitleiste mit Fortschritt -->
    <DayTimeline
      :bloecke="bloecke"
      :von="von"
      :bis="bis"
      :jetzt="istHeute ? jetzt : undefined"
      @anlegen="anlegen(datum, $event)"
      @aendern="aendern"
      @oeffnen="oeffnen"
      @menue="menue"
      @ablegen="(id, start) => ablegen(datum, id, start)"
      @ablegen-merker="(id, start) => ablegenMerker(datum, id, start)"
    >
      <div class="mt-4 flex items-center gap-3 text-sm">
        <span>Gebucht <span class="font-mono font-medium">{{ formatDauer(ist) }}</span> <span class="font-mono text-muted-foreground">/ {{ formatDauer(soll) }}</span></span>
        <Progress :model-value="fortschritt" class="flex-1" />
        <span class="text-[13px] text-muted-foreground">geplant <span class="font-mono">{{ formatDauer(geplant) }}</span></span>
      </div>
    </DayTimeline>

    <QuickInput :datum="datum">
      <Button variant="outline" class="h-11" @click="wieGestern">
        <Copy /> Wie gestern
      </Button>
      <Button class="h-11" @click="abschluss = true">
        <ClipboardCheck /> Tagesabschluss
      </Button>
    </QuickInput>

    <!-- Karten unter der Timeline: Aufgaben in Arbeit, Merker, Nachfassen, Daily-Themen -->
    <section class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-6">
      <AufgabenInArbeit :datum="datum" />
      <TodoSpalte />
      <AngepinnteNotizen />
      <NaechsterUrlaub darstellung="karte" />
    </section>

    <BlockDialog v-model:open="blockDialog" :block="bearbeiteterBlock" :entwurf="entwurf" />
    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageEntwurf" />
    <TagesabschlussSheet v-model:open="abschluss" :datum="datum" :bloecke="bloecke" :soll="soll" />
  </div>
</template>
