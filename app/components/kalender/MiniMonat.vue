<script setup lang="ts">
import { format, getDaysInMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import type { TagesInfo } from '#shared/utils/soll'

const props = defineProps<{
  jahr: number
  /** 1 … 12 */
  monat: number
  infos: Map<string, TagesInfo & { notiz: string | null, sollOverride: number | null, blocker: boolean, bestaetigt: boolean }>
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

// Kategorien als getönte Fläche + Rand in der Kategoriefarbe (Tokens), Text immer ink
const HALB_URLAUB = 'bg-[linear-gradient(135deg,color-mix(in_oklch,var(--konto-mint)_35%,transparent)_50%,transparent_50%)] ring-1 ring-inset ring-konto-mint'
const TYP_KLASSEN: Record<string, string> = {
  urlaub: 'bg-konto-mint/35 ring-1 ring-inset ring-konto-mint',
  halb_urlaub: HALB_URLAUB,
  krank: 'bg-konto-pfirsich/35 ring-1 ring-inset ring-konto-pfirsich',
  gleittag: 'bg-konto-himmel/35 ring-1 ring-inset ring-konto-himmel',
}

/** Farbe nach Tagestyp (nur an Arbeitstagen gespeichert), Feiertage umrandet, Wochenende gedimmt; Heute und Auswahl überdecken die Kategorie */
function klassen(datum: string) {
  const info = props.infos.get(datum)
  const a = props.auswahl
  const ausgewaehlt = !!a && datum >= a.von && datum <= a.bis
  if (datum === heuteDatum) return ['bg-primary font-medium text-primary-foreground', ausgewaehlt && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background']
  if (ausgewaehlt) return ['bg-primary/12 text-primary ring-1 ring-primary ring-inset']
  const liste: string[] = []
  if (info?.feiertag) liste.push('text-foreground ring-1 ring-muted-foreground ring-inset')
  else liste.push(info?.istArbeitstag ? 'text-foreground' : 'text-line-strong')
  if (info?.istArbeitstag) {
    // Unbestätigter Urlaub: nur gestrichelter Rand, bestätigt: getönte Fläche
    const offen = (info.typ === 'urlaub' || info.typ === 'halb_urlaub') && !info.bestaetigt
    const typ = offen ? 'border border-dashed border-konto-mint' : TYP_KLASSEN[info.typ]
    if (typ) liste.push(typ)
    if (info.blocker) liste.push('blocker-schraffur')
  }
  if (liste.length === 1) liste.push('hover:bg-muted')
  return liste
}

const TYP: Record<string, string> = { urlaub: 'Urlaub', halb_urlaub: '½ Urlaub', krank: 'Krank', gleittag: 'Gleittag' }

function titel(datum: string) {
  const info = props.infos.get(datum)
  const teile = [format(zuDate(datum), 'EEEE, d. MMMM', { locale: de })]
  if (info?.feiertag) teile.push(info.feiertag)
  if (info?.istArbeitstag && info.typ !== 'arbeit') {
    const unbestaetigt = (info.typ === 'urlaub' || info.typ === 'halb_urlaub') && !info.bestaetigt
    teile.push(`${TYP[info.typ] ?? info.typ}${unbestaetigt ? ' (unbestätigt)' : ''}`)
  }
  if (info?.istArbeitstag && info.blocker) teile.push('Blocker – kein Urlaub')
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
    <div class="mb-1.5 text-sm font-semibold">
      {{ format(zuDate(erster), 'MMMM', { locale: de }) }}
    </div>
    <div class="grid grid-cols-7 gap-0.5 text-center font-mono text-xs tabular-nums">
      <span v-for="w in WOCHENTAGE" :key="w.nr" class="mb-0.5 text-[11px] text-muted-foreground">{{ w.kurz.slice(0, 2) }}</span>
      <span v-for="i in leer" :key="`leer${i}`" />
      <button
        v-for="d in tage"
        :key="d"
        type="button"
        class="relative h-7 rounded-[6px] leading-none transition-colors"
        :class="klassen(d)"
        :title="titel(d)"
        @pointerdown.prevent="emit('start', d)"
        @pointerenter="emit('erweitern', d)"
      >
        {{ Number(d.slice(8)) }}
        <span v-if="hatOverride(d)" class="absolute right-0.5 bottom-0.5 size-1 rounded-full" :class="d === heuteDatum ? 'bg-primary-foreground' : 'bg-primary'" />
      </button>
    </div>
  </div>
</template>
