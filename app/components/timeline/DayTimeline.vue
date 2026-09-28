<script setup lang="ts">
import { Minus, Plus, RotateCcw } from '@lucide/vue'
import type { Zeitraum } from '#shared/utils/bloecke'
import { findeUeberlappung } from '#shared/utils/bloecke'
import type { Sicht, TimelineBlock } from '~/utils/timeline'
import { skalenSchritt, verschiebeSicht, zoomeSicht } from '~/utils/timeline'

const props = defineProps<{
  bloecke: TimelineBlock[]
  /** Standard-Sichtbereich in Minuten (Einstellungen) – Zoom/Verschieben startet hier */
  von: number
  bis: number
  /** Aktuelle Minute, falls der Tag heute ist (Jetzt-Linie) */
  jetzt?: number
}>()

const emit = defineEmits<{
  anlegen: [zeitraum: Zeitraum]
  aendern: [id: number, zeitraum: Zeitraum]
  oeffnen: [block: TimelineBlock]
  menue: [aktion: 'umschalten' | 'teilen' | 'loeschen' | 'bearbeiten' | 'wiederkehrend', block: TimelineBlock, minute: number]
  ablegen: [aufgabeId: number, start: number]
}>()

const spur = useTemplateRef<HTMLDivElement>('spur')

const RAND_PX = 8

// --- Sicht (Zoom & Verschieben) -----------------------------------------
const sicht = ref<Sicht>({ von: props.von, bis: props.bis })
const istStandardSicht = computed(() => sicht.value.von === props.von && sicht.value.bis === props.bis)

function sichtZuruecksetzen() {
  sicht.value = { von: props.von, bis: props.bis }
}
watch(() => [props.von, props.bis], sichtZuruecksetzen)

const spanne = computed(() => sicht.value.bis - sicht.value.von)

function prozent(minute: number): number {
  return ((Math.min(Math.max(minute, sicht.value.von), sicht.value.bis) - sicht.value.von) / spanne.value) * 100
}

/** Minute unter dem Mauszeiger, ungerundet */
function rohMinute(clientX: number): number {
  const rect = spur.value!.getBoundingClientRect()
  return sicht.value.von + ((clientX - rect.left) / rect.width) * spanne.value
}

function minuteBei(clientX: number): number {
  return Math.min(Math.max(aufRaster(rohMinute(clientX)), 0), TAG_MIN)
}

function zoomen(faktor: number, anker = (sicht.value.von + sicht.value.bis) / 2) {
  sicht.value = zoomeSicht(sicht.value, faktor, anker)
}

/** Strg/⌘ + Rad bzw. Pinch = Zoom um den Mauszeiger; horizontales Scrollen/Shift + Rad = verschieben */
function rad(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    zoomen(Math.exp(e.deltaY * 0.002), rohMinute(e.clientX))
    return
  }
  const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX
  if (!dx) return // normales Scrollen bleibt der Seite
  e.preventDefault()
  sicht.value = verschiebeSicht(sicht.value, (dx / spur.value!.clientWidth) * spanne.value)
}

const skala = computed(() => {
  const schritt = skalenSchritt(spanne.value)
  const beschriftung = schritt === 15 ? 30 : schritt
  const liste: { minute: number, label?: string }[] = []
  for (let m = Math.ceil(sicht.value.von / schritt) * schritt; m <= sicht.value.bis; m += schritt) {
    liste.push({ minute: m, label: m % beschriftung === 0 ? (beschriftung === 60 ? formatUhrzeit(m).slice(0, 2) : formatUhrzeit(m)) : undefined })
  }
  return liste
})

const sichtbareBloecke = computed(() => props.bloecke.filter(b => b.ende > sicht.value.von && b.start < sicht.value.bis))

// --- Ziehen -------------------------------------------------------------
type Zug
  = | { art: 'neu', anker: number, aktuell: number }
    | { art: 'verschieben' | 'links' | 'rechts', block: TimelineBlock, startMinute: number, aktuell: number, bewegt: boolean }
    | { art: 'schwenken', startX: number, startSicht: Sicht }

const zug = ref<Zug | null>(null)

/** Vorschau-Zeitraum des laufenden Zugs */
const vorschau = computed<(Zeitraum & { id?: number }) | null>(() => {
  const z = zug.value
  if (!z) return null
  if (z.art === 'schwenken') return null
  if (z.art === 'neu') {
    if (z.aktuell === z.anker) return null
    return { start: Math.min(z.anker, z.aktuell), ende: Math.max(z.anker, z.aktuell) }
  }
  const b = z.block
  const delta = z.aktuell - z.startMinute
  if (z.art === 'verschieben') {
    const dauer = b.ende - b.start
    const start = Math.min(Math.max(b.start + delta, 0), TAG_MIN - dauer)
    return { id: b.id, start, ende: start + dauer }
  }
  if (z.art === 'links') return { id: b.id, start: Math.min(b.start + delta, b.ende - RASTER_MIN), ende: b.ende }
  return { id: b.id, start: b.start, ende: Math.max(b.ende + delta, b.start + RASTER_MIN) }
})

const vorschauKollidiert = computed(() => {
  const v = vorschau.value
  return !!v && !!findeUeberlappung(props.bloecke, v, v.id)
})

function spurPointerDown(e: PointerEvent) {
  // Mittlere Maustaste: Sicht verschieben (auch über Blöcken)
  if (e.button === 1) {
    e.preventDefault() // kein Autoscroll
    zug.value = { art: 'schwenken', startX: e.clientX, startSicht: { ...sicht.value } }
    spur.value!.setPointerCapture(e.pointerId)
    return
  }
  if (e.button !== 0 || e.target !== spur.value) return
  const m = minuteBei(e.clientX)
  zug.value = { art: 'neu', anker: m, aktuell: m }
  spur.value!.setPointerCapture(e.pointerId)
}

function blockPointerDown(e: PointerEvent, block: TimelineBlock) {
  if (e.button !== 0) return // mittlere Taste bubbelt zur Spur (schwenken)
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const art = x < RAND_PX ? 'links' : x > rect.width - RAND_PX ? 'rechts' : 'verschieben'
  const m = minuteBei(e.clientX)
  zug.value = { art, block, startMinute: m, aktuell: m, bewegt: false }
  spur.value!.setPointerCapture(e.pointerId)
}

function pointerMove(e: PointerEvent) {
  const z = zug.value
  if (!z) return
  if (z.art === 'schwenken') {
    const delta = ((z.startX - e.clientX) / spur.value!.clientWidth) * (z.startSicht.bis - z.startSicht.von)
    sicht.value = verschiebeSicht(z.startSicht, delta)
    return
  }
  const m = minuteBei(e.clientX)
  if (m === z.aktuell) return
  z.aktuell = m
  if (z.art !== 'neu') z.bewegt = true
}

function pointerUp() {
  const z = zug.value
  const v = vorschau.value
  const kollidiert = vorschauKollidiert.value
  zug.value = null
  if (!z || z.art === 'schwenken') return

  if (z.art !== 'neu' && !z.bewegt) {
    emit('oeffnen', z.block)
    return
  }
  if (!v || kollidiert) return
  if (z.art === 'neu') emit('anlegen', { start: v.start, ende: v.ende })
  else if (v.start !== z.block.start || v.ende !== z.block.ende) emit('aendern', z.block.id, { start: v.start, ende: v.ende })
}

// --- Rechtsklick-Menü ---------------------------------------------------
const menueMinute = ref(0)

function menueOeffnen(e: MouseEvent) {
  menueMinute.value = minuteBei(e.clientX)
}

// --- Drop aus „Aufgaben in Arbeit“ -------------------------------------
function drop(e: DragEvent) {
  const id = Number(e.dataTransfer?.getData(DRAG_AUFGABE))
  if (id) emit('ablegen', id, minuteBei(e.clientX))
}

function istAufgabeDrag(e: DragEvent) {
  return e.dataTransfer?.types.includes(DRAG_AUFGABE) ?? false
}

// --- Darstellung --------------------------------------------------------
function blockKlassen(b: TimelineBlock) {
  return [
    b.kind === 'pause' ? 'bg-muted text-muted-foreground' : kontoFarbKlassen(b.kontoFarbe).flaeche,
    b.status === 'geplant' && 'schraffiert',
    zug.value && 'block' in zug.value && zug.value.block.id === b.id && 'opacity-30',
  ]
}

function position(z: Zeitraum) {
  const links = prozent(z.start)
  return { left: `${links}%`, width: `${Math.max(prozent(z.ende) - links, 0)}%` }
}
</script>

<template>
  <div class="select-none">
    <!-- Zoom-Leiste -->
    <div class="mb-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
      <span class="mr-1 tabular-nums">{{ formatUhrzeit(Math.round(sicht.von)) }}–{{ formatUhrzeit(Math.round(sicht.bis)) }}</span>
      <Button size="icon" variant="ghost" class="size-7" aria-label="Herauszoomen" @click="zoomen(1.5)">
        <Minus />
      </Button>
      <Button size="icon" variant="ghost" class="size-7" aria-label="Hineinzoomen" @click="zoomen(1 / 1.5)">
        <Plus />
      </Button>
      <Button size="icon" variant="ghost" class="size-7" aria-label="Zoom zurücksetzen" :disabled="istStandardSicht" @click="sichtZuruecksetzen">
        <RotateCcw />
      </Button>
    </div>

    <!-- Skala -->
    <div class="relative mb-1 h-4 overflow-hidden text-xs text-muted-foreground tabular-nums">
      <span
        v-for="s in skala.filter(s => s.label)"
        :key="s.minute"
        class="absolute -translate-x-1/2"
        :style="{ left: `${prozent(s.minute)}%` }"
      >{{ s.label }}</span>
    </div>

    <div
      ref="spur"
      class="relative h-20 cursor-crosshair touch-none overflow-hidden rounded-lg border bg-card"
      title="Strg + Mausrad: zoomen · Shift + Mausrad / mittlere Maustaste: verschieben"
      @pointerdown="spurPointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="zug = null"
      @wheel="rad"
      @dragover="istAufgabeDrag($event) && $event.preventDefault()"
      @drop.prevent="drop"
    >
      <!-- Skalenlinien -->
      <div
        v-for="s in skala"
        :key="s.minute"
        class="pointer-events-none absolute inset-y-0 w-px"
        :class="s.label ? 'bg-border/60' : 'bg-border/25'"
        :style="{ left: `${prozent(s.minute)}%` }"
      />

      <!-- Blöcke -->
      <ContextMenu v-for="b in sichtbareBloecke" :key="b.id">
        <ContextMenuTrigger as-child>
          <div
            class="absolute inset-y-2 flex cursor-grab flex-col justify-center overflow-hidden rounded-md px-2 text-xs leading-tight shadow-sm active:cursor-grabbing"
            :class="blockKlassen(b)"
            :style="position(b)"
            :title="`${blockTitel(b)}${b.vorlageName ? ` (${b.aufgabeTitel ?? b.kontoName})` : ''} · ${formatUhrzeit(b.start)}–${formatUhrzeit(b.ende)}${b.notiz ? ` · ${b.notiz}` : ''}`"
            @pointerdown="blockPointerDown($event, b)"
            @contextmenu="menueOeffnen"
          >
            <span class="absolute inset-y-0 left-0 w-2 cursor-ew-resize" />
            <span class="truncate font-medium">{{ blockTitel(b) }}</span>
            <span class="truncate tabular-nums opacity-80">{{ formatUhrzeit(b.start) }}–{{ formatUhrzeit(b.ende) }}</span>
            <span class="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem @select="emit('menue', 'umschalten', b, menueMinute)">
            {{ b.status === 'geplant' ? 'Buchen' : 'Als geplant markieren' }}
          </ContextMenuItem>
          <ContextMenuItem @select="emit('menue', 'teilen', b, menueMinute)">
            Hier teilen
          </ContextMenuItem>
          <ContextMenuItem @select="emit('menue', 'bearbeiten', b, menueMinute)">
            Aufgabe/Konto ändern …
          </ContextMenuItem>
          <ContextMenuItem v-if="b.kind === 'arbeit' && !b.vorlageId" @select="emit('menue', 'wiederkehrend', b, menueMinute)">
            Als wiederkehrend speichern …
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" @select="emit('menue', 'loeschen', b, menueMinute)">
            Löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <!-- Vorschau beim Ziehen -->
      <div
        v-if="vorschau"
        class="pointer-events-none absolute inset-y-1 rounded-md border-2 border-dashed"
        :class="vorschauKollidiert ? 'border-destructive bg-destructive/15' : 'border-primary bg-primary/15'"
        :style="position(vorschau)"
      >
        <span class="absolute -top-0.5 left-1 text-[10px] tabular-nums">
          {{ formatUhrzeit(vorschau.start) }}–{{ formatUhrzeit(vorschau.ende) }}
        </span>
      </div>

      <!-- Jetzt-Linie -->
      <div
        v-if="jetzt !== undefined && jetzt >= sicht.von && jetzt <= sicht.bis"
        class="pointer-events-none absolute inset-y-0 w-0.5 bg-primary"
        :style="{ left: `${prozent(jetzt)}%` }"
      />
    </div>
  </div>
</template>
