<script setup lang="ts">
import { format, getISOWeek, startOfISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TriangleAlert } from '@lucide/vue'
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

useHead({ title: () => `KW ${kw.value} · daybreak` })

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
  <div class="grid items-start gap-8 xl:grid-cols-[1fr_18rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-6">
      <!-- Kopf -->
      <div class="flex flex-wrap items-center gap-3">
        <Button size="icon" variant="ghost" aria-label="Vorherige Woche" @click="wocheWechseln(-1)">
          <ChevronLeft />
        </Button>
        <div class="w-52 shrink-0">
          <h1 class="text-2xl font-semibold tracking-tight">
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
        <div class="grow" />
        <div class="flex items-center gap-2">
          <Switch id="wochenende" v-model="mitWochenende" :disabled="wochenendeHatInhalt" />
          <Label for="wochenende" class="font-normal text-muted-foreground">Wochenende</Label>
        </div>
        <div class="flex h-8 items-center gap-2 rounded-full border px-3 font-mono text-[13px] text-muted-foreground">
          <span>Woche <span class="text-foreground">{{ formatDauer(summe.ist) }}</span> / {{ formatDauer(summe.soll) }}</span>
          <span :class="summe.ist - summe.soll >= 0 ? 'text-positiv' : 'text-negativ'">{{ formatSaldo(summe.ist - summe.soll) }}</span>
          <span>· geplant {{ formatDauer(summe.geplant) }}</span>
        </div>
      </div>

      <!-- Tage -->
      <div class="grid gap-2">
        <div v-for="t in sichtbareTage" :key="t.datum" class="flex items-stretch gap-3">
          <div class="flex w-30 shrink-0 flex-col justify-end gap-0.5 pb-1">
            <NuxtLink
              :to="t.datum === heute() ? '/' : `/?datum=${t.datum}`"
              class="text-sm font-semibold hover:underline"
              :class="t.datum === heute() ? 'text-primary' : 'text-foreground'"
            >
              {{ format(zuDate(t.datum), 'EEE, d.M.', { locale: de }) }}
            </NuxtLink>
            <span class="font-mono text-xs text-muted-foreground">
              <span class="text-foreground">{{ formatDauer(t.ist) }}</span> / {{ formatDauer(t.soll) }}
            </span>
            <span v-if="t.geplant" class="font-mono text-xs text-muted-foreground">geplant {{ formatDauer(t.geplant) }}</span>
            <Badge v-if="tagLabel(t.info)" variant="secondary" class="w-fit">
              {{ tagLabel(t.info) }}
            </Badge>
            <span v-if="t.konflikte" class="flex items-start gap-1 text-xs text-warnung">
              <TriangleAlert class="mt-px size-3.5 shrink-0" />
              {{ t.konflikte }} Vorlage(n) nicht eingetragen – belegt
            </span>
          </div>
          <div class="min-w-0 flex-1">
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
      </div>
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <AufgabenInArbeit :datum="heute()" />
      <p class="text-[13px] text-muted-foreground">
        Aufgaben auf einen Tag ziehen, um sie einzuplanen (1 h). Blöcke lassen sich wie auf „Heute“ ziehen, verschieben und per Rechtsklick bearbeiten.
      </p>
    </aside>

    <BlockDialog v-model:open="blockDialog" :block="bearbeiteterBlock" :entwurf="entwurf" />
    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageEntwurf" />
  </div>
</template>
