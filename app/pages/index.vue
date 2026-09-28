<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ClipboardCheck, Copy, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Zeitraum } from '#shared/utils/bloecke'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import type { BlockEntwurf } from '~/components/timeline/BlockDialog.vue'
import QuickInput from '~/components/quick-input/QuickInput.vue'
import SaldoWidget from '~/components/widgets/SaldoWidget.vue'
import TagEinstellung from '~/components/widgets/TagEinstellung.vue'
import AufgabenInArbeit from '~/components/widgets/AufgabenInArbeit.vue'
import TodoSpalte from '~/components/widgets/TodoSpalte.vue'
import type { VorlageFormular } from '~/components/VorlageDialog.vue'
import type { TimelineBlock } from '~/utils/timeline'

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

// Jetzt-Linie, minütlich aktualisiert (nur Client)
const jetzt = ref<number>()
function jetztAktualisieren() {
  const d = new Date()
  jetzt.value = d.getHours() * 60 + d.getMinutes()
}
onMounted(() => {
  jetztAktualisieren()
  const timer = setInterval(jetztAktualisieren, 60_000)
  onBeforeUnmount(() => clearInterval(timer))
})

const ist = computed(() => istMinuten(bloecke.value))
const geplant = computed(() => geplantMinuten(bloecke.value))
const soll = computed(() => info.value?.soll ?? 0)
const fortschritt = computed(() => (soll.value ? Math.min(100, Math.round((ist.value / soll.value) * 100)) : 0))

function tagWechseln(tage: number) {
  const ziel = plusTage(datum.value, tage)
  navigateTo({ query: ziel === heute() ? {} : { datum: ziel } })
}

/** Neuer Block: vergangene Zeit ist gebucht, Zukunft geplant */
function standardStatus(ende: number) {
  if (datum.value < heute()) return 'gebucht' as const
  if (datum.value > heute()) return 'geplant' as const
  return ende <= (jetzt.value ?? 0) ? 'gebucht' as const : 'geplant' as const
}

// --- Block-Dialog ------------------------------------------------------
const blockDialog = ref(false)
const bearbeiteterBlock = ref<TimelineBlock | null>(null)
const entwurf = ref<BlockEntwurf | null>(null)

function anlegen(z: Zeitraum) {
  bearbeiteterBlock.value = null
  entwurf.value = { datum: datum.value, ...z, status: standardStatus(z.ende) }
  blockDialog.value = true
}

function oeffnen(b: TimelineBlock) {
  entwurf.value = null
  bearbeiteterBlock.value = b
  blockDialog.value = true
}

async function aendern(id: number, z: Zeitraum) {
  await aktion(() => api(`/api/blocks/${id}`, { method: 'PATCH', body: { ...z } }), TAG_KEYS)
}

// --- Vorlage aus Block --------------------------------------------------
const vorlageDialog = ref(false)
const vorlageEntwurf = ref<VorlageFormular | null>(null)

async function menue(aktionName: 'umschalten' | 'teilen' | 'loeschen' | 'bearbeiten' | 'wiederkehrend', b: TimelineBlock, minute: number) {
  switch (aktionName) {
    case 'umschalten':
      await aktion(() => api(`/api/blocks/${b.id}`, { method: 'PATCH', body: { status: b.status === 'geplant' ? 'gebucht' : 'geplant' } }), TAG_KEYS)
      break
    case 'teilen': {
      const bei = minute > b.start && minute < b.ende ? minute : aufRaster((b.start + b.ende) / 2)
      await aktion(() => api(`/api/blocks/${b.id}/teilen`, { method: 'POST', body: { bei } }), TAG_KEYS)
      break
    }
    case 'loeschen':
      await aktion(() => api(`/api/blocks/${b.id}`, { method: 'DELETE' }), TAG_KEYS)
      break
    case 'bearbeiten':
      oeffnen(b)
      break
    case 'wiederkehrend':
      vorlageEntwurf.value = {
        name: null,
        aufgabeId: b.aufgabeId,
        kontoId: b.kontoId,
        start: b.start,
        ende: b.ende,
        wochentage: [wochentag(b.datum)],
        intervallWochen: 1,
        gueltigAb: b.datum,
        gueltigBis: null,
        ausBlockId: b.id,
      }
      vorlageDialog.value = true
      break
  }
}

// --- Drop aus „Aufgaben in Arbeit“: 1h-Block ab der Drop-Position --------
async function ablegen(aufgabeId: number, start: number) {
  const ende = Math.min(start + 60, TAG_MIN)
  await aktion(() => api('/api/blocks', {
    method: 'POST',
    body: { datum: datum.value, kind: 'arbeit', status: standardStatus(ende), start, ende, aufgabeId },
  }), TAG_KEYS)
}

// --- Drop eines Merkers: 30 min geplant, Text als Notiz ----------------
const { data: offeneTodos } = useOffeneTodos()

async function ablegenMerker(todoId: number, start: number) {
  const merker = offeneTodos.value.find(t => t.id === todoId)
  if (!merker) return
  const ende = Math.min(start + 30, TAG_MIN)
  // Arbeitsblock braucht ein Konto – ohne Bezug im Dialog wählen lassen
  if (!merker.aufgabeId && !merker.kontoId) {
    bearbeiteterBlock.value = null
    entwurf.value = { datum: datum.value, start, ende, status: 'geplant', notiz: merker.text }
    blockDialog.value = true
    return
  }
  await aktion(() => api('/api/blocks', {
    method: 'POST',
    body: {
      datum: datum.value,
      kind: 'arbeit',
      status: 'geplant',
      start,
      ende,
      ...(merker.aufgabeId ? { aufgabeId: merker.aufgabeId } : { kontoId: merker.kontoId }),
      notiz: merker.text,
    },
  }), TAG_KEYS)
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
    <div class="grid min-w-0 content-start gap-5">
      <!-- Kopf -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Vorheriger Tag" @click="tagWechseln(-1)">
            <ChevronLeft />
          </Button>
          <!-- Feste Breite, damit die Pfeile beim Blättern nicht springen (längstes Datum passt rein) -->
          <div class="w-60 shrink-0 text-center">
            <h1 class="truncate text-2xl font-semibold">
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
        @anlegen="anlegen"
        @aendern="aendern"
        @oeffnen="oeffnen"
        @menue="menue"
        @ablegen="ablegen"
        @ablegen-merker="ablegenMerker"
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
    <section class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AufgabenInArbeit :datum="datum" />
      <TodoSpalte />
    </section>

    <BlockDialog v-model:open="blockDialog" :block="bearbeiteterBlock" :entwurf="entwurf" />
    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageEntwurf" />
    <TagesabschlussSheet v-model:open="abschluss" :datum="datum" :bloecke="bloecke" :soll="soll" />
  </div>
</template>
