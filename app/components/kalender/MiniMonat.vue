<script setup lang="ts">
import { format, getDaysInMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import type { TagesInfo } from '#shared/utils/soll'

const props = defineProps<{
  jahr: number
  /** 1 … 12 */
  monat: number
  infos: Map<string, TagesInfo & { notiz: string | null, sollOverride: number | null }>
  auswahl: { von: string, bis: string } | null
}>()

const emit = defineEmits<{
  start: [datum: string]
  erweitern: [datum: string]
}>()

const erster = computed(() => `${props.jahr}-${String(props.monat).padStart(2, '0')}-01`)
const leer = computed(() => wochentag(erster.value) - 1)
const tage = computed(() => {
  const anzahl = getDaysInMonth(zuDate(erster.value))
  return Array.from({ length: anzahl }, (_, i) => plusTage(erster.value, i))
})

const heuteDatum = heute()

/** Farbe nach Tagestyp (nur an Arbeitstagen gespeichert), Feiertage umrandet, Wochenende gedimmt */
function klassen(datum: string) {
  const info = props.infos.get(datum)
  const liste: string[] = []
  if (info?.feiertag) liste.push('ring-1 ring-inset ring-konto-rose text-konto-rose')
  else if (!info?.istArbeitstag) liste.push('text-muted-foreground/50')
  if (info?.istArbeitstag) {
    if (info.typ === 'urlaub') liste.push('bg-konto-mint text-konto-mint-fg')
    else if (info.typ === 'halb_urlaub') liste.push('bg-konto-mint/45 text-foreground')
    else if (info.typ === 'krank') liste.push('bg-konto-pfirsich text-konto-pfirsich-fg')
    else if (info.typ === 'gleittag') liste.push('bg-konto-himmel text-konto-himmel-fg')
  }
  if (datum === heuteDatum) liste.push('font-bold underline underline-offset-2')
  const a = props.auswahl
  if (a && datum >= a.von && datum <= a.bis) liste.push('outline-2 outline-primary -outline-offset-1')
  return liste
}

const TYP: Record<string, string> = { urlaub: 'Urlaub', halb_urlaub: '½ Urlaub', krank: 'Krank', gleittag: 'Gleittag' }

function titel(datum: string) {
  const info = props.infos.get(datum)
  const teile = [format(zuDate(datum), 'EEEE, d. MMMM', { locale: de })]
  if (info?.feiertag) teile.push(info.feiertag)
  if (info?.istArbeitstag && info.typ !== 'arbeit') teile.push(TYP[info.typ] ?? info.typ)
  if (info?.sollOverride != null) teile.push(`Soll ${formatDauer(info.sollOverride)}`)
  if (info?.notiz) teile.push(info.notiz)
  return teile.join(' · ')
}

function hatOverride(datum: string) {
  return props.infos.get(datum)?.sollOverride != null
}
</script>

<template>
  <div class="select-none">
    <div class="mb-1 text-sm font-medium">
      {{ format(zuDate(erster), 'MMMM', { locale: de }) }}
    </div>
    <div class="grid grid-cols-7 gap-0.5 text-center text-[11px] tabular-nums">
      <span v-for="w in WOCHENTAGE" :key="w.nr" class="text-muted-foreground">{{ w.kurz.slice(0, 2) }}</span>
      <span v-for="i in leer" :key="`leer${i}`" />
      <button
        v-for="d in tage"
        :key="d"
        type="button"
        class="relative aspect-square rounded-sm leading-none transition-colors hover:bg-accent"
        :class="klassen(d)"
        :title="titel(d)"
        @pointerdown.prevent="emit('start', d)"
        @pointerenter="emit('erweitern', d)"
      >
        {{ Number(d.slice(8)) }}
        <span v-if="hatOverride(d)" class="absolute right-0.5 bottom-0.5 size-1 rounded-full bg-primary" />
      </button>
    </div>
  </div>
</template>
