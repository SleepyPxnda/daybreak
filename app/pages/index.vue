<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ClipboardCheck, Copy, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import QuickInput from '~/components/quick-input/QuickInput.vue'
import SaldoWidget from '~/components/widgets/SaldoWidget.vue'
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

useHead({ title: () => `${istHeute.value ? 'Heute' : format(zuDate(datum.value), 'EEE d. MMM', { locale: de })} · Daybreak` })

const { data: einstellungen } = useEinstellungen()
const { bloecke, konflikte, info, saldo } = useTag(datum)

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
</script>

<template>
  <div class="grid gap-8">
    <div class="grid min-w-0 grid-cols-1 content-start gap-5">
      <!-- Kopf -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Vorheriger Tag" @click="tagWechseln(-1)">
            <ChevronLeft />
          </Button>
          <!-- Feste Breite, damit die Pfeile beim Blättern nicht springen (längstes Datum passt rein) -->
          <div class="w-60 shrink-0 text-center">
            <h1 class="truncate text-2xl">
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
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <TagEinstellung
            v-if="info"
            :datum="datum"
            :typ="info.typ"
            :soll="info.soll"
            :feiertag="info.feiertag"
            :ist-arbeitstag="info.istArbeitstag"
            :notiz="info.notiz"
          />
          <SaldoWidget v-if="saldo" :konto-bis-gestern="saldo.kontoBisGestern" :ist="saldo.heute.ist" :soll="saldo.heute.soll" />
        </div>
      </div>

      <NaechsterUrlaub darstellung="banner" />

      <Badge v-if="konflikte.length" variant="outline" class="w-fit gap-1 border-konto-butter text-konto-butter">
        <TriangleAlert class="size-3.5" />
        {{ konflikte.length }} wiederkehrende{{ konflikte.length === 1 ? 'r Block' : ' Blöcke' }} nicht eingetragen – Zeitraum belegt
      </Badge>

      <!-- Timeline -->
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
      />

      <!-- Fortschritt -->
      <div class="grid gap-1.5">
        <div class="flex justify-between text-sm tabular-nums">
          <span>Gebucht <strong>{{ formatDauer(ist) }}</strong> / {{ formatDauer(soll) }}</span>
          <span class="text-muted-foreground">geplant {{ formatDauer(geplant) }}</span>
        </div>
        <Progress :model-value="fortschritt" class="h-2" />
      </div>

      <QuickInput :datum="datum" />

      <div class="flex gap-2">
        <Button variant="secondary" @click="wieGestern">
          <Copy /> Wie gestern
        </Button>
        <Button @click="abschluss = true">
          <ClipboardCheck /> Tagesabschluss
        </Button>
      </div>
    </div>

    <!-- Karten unter der Timeline: Aufgaben in Arbeit, Merker, Nachfassen, Daily-Themen -->
    <section class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
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
