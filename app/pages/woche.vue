<script setup lang="ts">
import { format, getISOWeek, startOfISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import AufgabenInArbeit from '~/components/widgets/AufgabenInArbeit.vue'
import type { TimelineBlock } from '~/utils/timeline'

// Woche (Plan §5.3): 5 bzw. 7 Timelines untereinander, Planung per Drag & Drop, Tages- und Wochensummen
const route = useRoute()

const montag = computed(() => {
  const d = String(route.query.woche ?? '')
  return zuDatum(startOfISOWeek(zuDate(istDatum(d) ? d : heute())))
})
const sonntag = computed(() => plusTage(montag.value, 6))
const kw = computed(() => getISOWeek(zuDate(montag.value)))
const istDieseWoche = computed(() => montag.value === zuDatum(startOfISOWeek(new Date())))

useHead({ title: () => `KW ${kw.value} · Daybreak` })

const { data: einstellungen } = useEinstellungen()
const von = computed(() => einstellungen.value?.timelineVon ?? 420)
const bis = computed(() => einstellungen.value?.timelineBis ?? 1140)

const zeitraum = { von: montag, bis: sonntag }
const { data: bloeckeAntwort } = useFetch('/api/blocks', {
  key: 'woche-bloecke',
  query: zeitraum,
  default: () => ({ bloecke: [] as TimelineBlock[], konflikte: [] as { vorlageId: number, datum: string }[] }),
})
const { data: tagesInfos } = useFetch('/api/tage', { key: 'woche-tage', query: zeitraum, default: () => [] })

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

// Wochenende nur zeigen, wenn gewünscht oder dort etwas liegt
const mitWochenende = ref(false)

const tage = computed(() => {
  const alle = (bloeckeAntwort.value.bloecke as TimelineBlock[])
  return datumsBereich(montag.value, sonntag.value).map((datum) => {
    const bloecke = alle.filter(b => b.datum === datum)
    const info = tagesInfos.value.find(t => t.datum === datum)
    return {
      datum,
      bloecke,
      info,
      ist: istMinuten(bloecke),
      geplant: geplantMinuten(bloecke),
      soll: info?.soll ?? 0,
      konflikte: bloeckeAntwort.value.konflikte.filter(k => k.datum === datum).length,
      istWochenende: wochentag(datum) >= 6,
    }
  })
})
const wochenendeHatInhalt = computed(() => tage.value.some(t => t.istWochenende && (t.bloecke.length || t.soll)))
const sichtbareTage = computed(() => tage.value.filter(t => !t.istWochenende || mitWochenende.value || wochenendeHatInhalt.value))

const summe = computed(() => ({
  ist: tage.value.reduce((s, t) => s + t.ist, 0),
  geplant: tage.value.reduce((s, t) => s + t.geplant, 0),
  soll: tage.value.reduce((s, t) => s + t.soll, 0),
}))

function wocheWechseln(wochen: number) {
  const ziel = plusTage(montag.value, wochen * 7)
  navigateTo({ query: ziel === zuDatum(startOfISOWeek(new Date())) ? {} : { woche: ziel } })
}

const TYP_LABEL: Record<string, string> = { urlaub: 'Urlaub', halb_urlaub: '½ Urlaub', krank: 'Krank', gleittag: 'Gleittag' }
function tagLabel(info?: { feiertag?: string, typ: string, istArbeitstag: boolean }) {
  if (!info) return undefined
  if (info.feiertag) return info.feiertag
  if (info.istArbeitstag && info.typ !== 'arbeit') return TYP_LABEL[info.typ]
  return undefined
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1fr_18rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-5">
      <!-- Kopf -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Vorherige Woche" @click="wocheWechseln(-1)">
            <ChevronLeft />
          </Button>
          <div class="w-60 shrink-0 text-center">
            <h1 class="text-2xl font-semibold">
              KW {{ kw }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ format(zuDate(montag), 'd. MMM', { locale: de }) }} – {{ format(zuDate(sonntag), 'd. MMM yyyy', { locale: de }) }}
            </p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Nächste Woche" @click="wocheWechseln(1)">
            <ChevronRight />
          </Button>
          <Button size="sm" variant="ghost" :class="{ invisible: istDieseWoche }" :tabindex="istDieseWoche ? -1 : 0" @click="navigateTo({ query: {} })">
            Diese Woche
          </Button>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <Switch id="wochenende" v-model="mitWochenende" :disabled="wochenendeHatInhalt" />
            <Label for="wochenende" class="text-muted-foreground">Wochenende</Label>
          </div>
          <div class="rounded-lg border bg-card px-3 py-2 text-sm tabular-nums">
            Woche <strong>{{ formatDauer(summe.ist) }}</strong> / {{ formatDauer(summe.soll) }}
            <span :class="summe.ist - summe.soll >= 0 ? 'text-positiv' : 'text-negativ'">({{ formatSaldo(summe.ist - summe.soll) }})</span>
            <span class="text-muted-foreground"> · geplant {{ formatDauer(summe.geplant) }}</span>
          </div>
        </div>
      </div>

      <!-- Tage -->
      <div v-for="t in sichtbareTage" :key="t.datum" class="grid gap-1.5">
        <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <div class="flex items-baseline gap-2">
            <NuxtLink
              :to="t.datum === heute() ? '/' : `/?datum=${t.datum}`"
              class="font-medium hover:underline"
              :class="{ 'text-primary': t.datum === heute() }"
            >
              {{ format(zuDate(t.datum), 'EEEE, d.M.', { locale: de }) }}
            </NuxtLink>
            <Badge v-if="tagLabel(t.info)" variant="secondary">
              {{ tagLabel(t.info) }}
            </Badge>
            <span v-if="t.konflikte" class="text-xs text-konto-butter">{{ t.konflikte }} Vorlage(n) nicht eingetragen – belegt</span>
          </div>
          <span class="tabular-nums text-muted-foreground">
            <span class="text-foreground">{{ formatDauer(t.ist) }}</span> / {{ formatDauer(t.soll) }}
            <template v-if="t.geplant"> · geplant {{ formatDauer(t.geplant) }}</template>
          </span>
        </div>
        <DayTimeline
          :bloecke="t.bloecke"
          :von="von"
          :bis="bis"
          :jetzt="t.datum === heute() ? jetzt : undefined"
          kompakt
          @anlegen="anlegen(t.datum, $event)"
          @aendern="aendern"
          @oeffnen="oeffnen"
          @menue="menue"
          @ablegen="(id, start) => ablegen(t.datum, id, start)"
          @ablegen-merker="(id, start) => ablegenMerker(t.datum, id, start)"
        />
      </div>
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <AufgabenInArbeit :datum="heute()" />
      <p class="text-xs text-muted-foreground">
        Aufgaben auf einen Tag ziehen, um sie einzuplanen (1 h). Blöcke lassen sich wie auf „Heute“ ziehen, verschieben und per Rechtsklick bearbeiten.
      </p>
    </aside>

    <BlockDialog v-model:open="blockDialog" :block="bearbeiteterBlock" :entwurf="entwurf" />
    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageEntwurf" />
  </div>
</template>
