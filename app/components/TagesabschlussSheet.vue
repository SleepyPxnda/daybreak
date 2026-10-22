<script setup lang="ts">
import { Check, Plus, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { parseDauer } from '#shared/utils/quickInput'
import type { TimelineBlock } from '~/utils/timeline'

// Plan §5 Tagesabschluss: Lücke zum Soll, geplante Blöcke übernehmen, 1-Klick-Vorschläge
const props = defineProps<{
  datum: string
  bloecke: TimelineBlock[]
  soll: number
}>()
const offen = defineModel<boolean>('open', { default: false })

const ist = computed(() => istMinuten(props.bloecke))
const luecke = computed(() => props.soll - ist.value)
const geplante = computed(() => props.bloecke.filter(b => b.status === 'geplant'))

const { data: vorschlaege } = useFetch('/api/blocks/zuletzt', {
  key: 'zuletzt',
  query: { datum: toRef(props, 'datum') },
  default: () => [],
})

const dauerText = ref('')
watch(offen, (jetztOffen) => {
  if (jetztOffen) dauerText.value = luecke.value > 0 ? formatDauer(luecke.value).replace(':', 'h') : '30m'
})
const dauer = computed(() => parseDauer(dauerText.value))

async function uebernehmen(ids?: number[]) {
  await aktion(() => api('/api/blocks/uebernehmen', { method: 'POST', body: { datum: props.datum, ids } }), TAG_KEYS)
}

async function buchen(v: { aufgabeId: number | null, kontoId: number | null }) {
  if (!dauer.value || dauer.value % RASTER_MIN !== 0) return void toast.error('Dauer im 15-min-Raster angeben, z. B. 1h30 oder 45m')
  await aktion(() => api('/api/blocks', {
    method: 'POST',
    body: { datum: props.datum, kind: 'arbeit', status: 'gebucht', dauer: dauer.value, ...(v.aufgabeId ? { aufgabeId: v.aufgabeId } : { kontoId: v.kontoId }) },
  }), TAG_KEYS)
}

function chipText(v: { aufgabeKey: string | null, aufgabeTitel: string | null, kontoName: string | null }) {
  return v.aufgabeTitel ? `${v.aufgabeKey ? `${v.aufgabeKey} ` : ''}${v.aufgabeTitel}` : (v.kontoName ?? '')
}
</script>

<template>
  <Sheet v-model:open="offen">
    <SheetContent class="w-full gap-0 sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Tagesabschluss</SheetTitle>
        <SheetDescription class="tabular-nums">
          Gebucht {{ formatDauer(ist) }} von {{ formatDauer(soll) }}
        </SheetDescription>
      </SheetHeader>

      <div class="grid gap-6 overflow-y-auto px-4 pb-6">
        <div class="rounded-xl border bg-card p-4 text-center tabular-nums">
          <template v-if="luecke > 0">
            <div class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <TriangleAlert class="size-3.5 text-negativ" /> Lücke zum Soll
            </div>
            <div class="text-2xl font-semibold text-negativ">
              {{ formatSaldo(-luecke) }}
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Check class="size-3.5 text-positiv" /> Soll erreicht
            </div>
            <div class="text-2xl font-semibold text-positiv">
              {{ formatSaldo(-luecke) }}
            </div>
          </template>
        </div>

        <section class="grid grid-cols-1 gap-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">
              Geplant
            </h3>
            <Button v-if="geplante.length" size="sm" @click="uebernehmen()">
              <Check /> Plan übernehmen
            </Button>
          </div>
          <p v-if="!geplante.length" class="text-sm text-muted-foreground">
            Keine geplanten Blöcke.
          </p>
          <div v-for="b in geplante" :key="b.id" class="flex min-h-10 items-center gap-2.5 rounded-md border bg-card py-1 pr-1 pl-3 text-sm">
            <span class="size-2 shrink-0 rounded-full" :class="b.kind === 'pause' ? 'bg-muted-foreground' : kontoFarbKlassen(b.kontoFarbe).punkt" />
            <span class="auslaufen min-w-0 flex-1" :title="blockTitel(b)">{{ blockTitel(b) }}</span>
            <span class="font-mono text-[13px] text-muted-foreground">{{ formatUhrzeit(b.start) }}–{{ formatUhrzeit(b.ende) }}</span>
            <Button size="icon-sm" variant="ghost" aria-label="Übernehmen" @click="uebernehmen([b.id])">
              <Check />
            </Button>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-2">
          <h3 class="text-sm font-semibold">
            Schnell buchen
          </h3>
          <div class="flex items-center gap-2">
            <Label for="abschluss-dauer" class="font-normal text-muted-foreground">Dauer</Label>
            <Input id="abschluss-dauer" v-model="dauerText" class="w-24 font-mono" />
            <span class="font-mono text-[13px] text-muted-foreground">{{ dauer ? formatDauer(dauer) : '' }}</span>
          </div>
          <p v-if="!vorschlaege.length" class="text-sm text-muted-foreground">
            Noch keine Buchungen in den letzten 14 Tagen.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="v in vorschlaege"
              :key="`${v.aufgabeId}-${v.kontoId}`"
              type="button"
              class="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition hover:brightness-125"
              :class="kontoFarbKlassen(v.kontoFarbe).flaeche"
              :title="chipText(v)"
              @click="buchen(v)"
            >
              <Plus class="size-3.5 shrink-0" />
              <span class="truncate">{{ chipText(v) }}</span>
            </button>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
