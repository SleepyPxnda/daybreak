<script setup lang="ts">
import { Check, Plus } from '@lucide/vue'
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
        <div class="rounded-lg border bg-card p-4 text-center tabular-nums">
          <template v-if="luecke > 0">
            <div class="text-sm text-muted-foreground">
              Lücke zum Soll
            </div>
            <div class="text-2xl font-semibold text-negativ">
              {{ formatSaldo(-luecke) }}
            </div>
          </template>
          <template v-else>
            <div class="text-sm text-muted-foreground">
              Soll erreicht
            </div>
            <div class="text-2xl font-semibold text-positiv">
              {{ formatSaldo(-luecke) }}
            </div>
          </template>
        </div>

        <section class="grid gap-2">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">
              Geplant
            </h3>
            <Button v-if="geplante.length" size="sm" @click="uebernehmen()">
              <Check /> Plan übernehmen
            </Button>
          </div>
          <p v-if="!geplante.length" class="text-sm text-muted-foreground">
            Keine geplanten Blöcke.
          </p>
          <div v-for="b in geplante" :key="b.id" class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span class="size-2.5 shrink-0 rounded-full" :class="b.kind === 'pause' ? 'bg-muted-foreground' : kontoFarbKlassen(b.kontoFarbe).punkt" />
            <span class="flex-1 truncate">{{ blockTitel(b) }}</span>
            <span class="tabular-nums text-muted-foreground">{{ formatUhrzeit(b.start) }}–{{ formatUhrzeit(b.ende) }}</span>
            <Button size="icon" variant="ghost" aria-label="Übernehmen" @click="uebernehmen([b.id])">
              <Check />
            </Button>
          </div>
        </section>

        <section class="grid gap-2">
          <h3 class="font-medium">
            Schnell buchen
          </h3>
          <div class="flex items-center gap-2">
            <Label for="abschluss-dauer" class="text-muted-foreground">Dauer</Label>
            <Input id="abschluss-dauer" v-model="dauerText" class="w-24 font-mono" />
            <span class="text-sm text-muted-foreground">{{ dauer ? formatDauer(dauer) : '' }}</span>
          </div>
          <p v-if="!vorschlaege.length" class="text-sm text-muted-foreground">
            Noch keine Buchungen in den letzten 14 Tagen.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="v in vorschlaege"
              :key="`${v.aufgabeId}-${v.kontoId}`"
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition hover:brightness-110"
              :class="kontoFarbKlassen(v.kontoFarbe).flaeche"
              @click="buchen(v)"
            >
              <Plus class="size-3.5" />
              {{ v.aufgabeTitel ? `${v.aufgabeKey ? `${v.aufgabeKey} ` : ''}${v.aufgabeTitel}` : v.kontoName }}
            </button>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
