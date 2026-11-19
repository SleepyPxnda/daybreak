<script setup lang="ts">
import { Minus, Plus, RotateCcw } from '@lucide/vue'
import { cn } from '@/lib/utils'
import type { TimeRange } from '#shared/utils/blocks'
import { findOverlap } from '#shared/utils/blocks'
import type { View, TimelineBlock } from '~/utils/timeline'
import { scaleStep, shiftView, zoomView } from '~/utils/timeline'

const props = defineProps<{
  blocks: TimelineBlock[]
  /** Default visible range in minutes (settings) - zoom/pan starts here */
  from: number
  to: number
  /** Current minute if the day is today (now line) */
  currentMinute?: number
  /** Compact (week): flatter, no zoom bar - zooming with Ctrl+wheel still works */
  compact?: boolean
}>()

const emit = defineEmits<{
  create: [range: TimeRange]
  change: [id: number, range: TimeRange]
  open: [block: TimelineBlock]
  menu: [runAction: 'toggle' | 'split' | 'delete' | 'edit' | 'recurring', block: TimelineBlock, minute: number]
  drop: [taskId: number, start: number]
  dropReminder: [todoId: number, start: number]
}>()

const track = useTemplateRef<HTMLDivElement>('track')

const EDGE_PX = 8

// --- View (zoom and pan) -----------------------------------------
const view = ref<View>({ from: props.from, to: props.to })
const isDefaultView = computed(() => view.value.from === props.from && view.value.to === props.to)

function resetView() {
  view.value = { from: props.from, to: props.to }
}
watch(() => [props.from, props.to], resetView)

const span = computed(() => view.value.to - view.value.from)

function percent(minute: number): number {
  return ((Math.min(Math.max(minute, view.value.from), view.value.to) - view.value.from) / span.value) * 100
}

/** Minute under the mouse pointer, unrounded */
function rawMinute(clientX: number): number {
  const rect = track.value!.getBoundingClientRect()
  return view.value.from + ((clientX - rect.left) / rect.width) * span.value
}

function minuteAt(clientX: number): number {
  return Math.min(Math.max(snapToGrid(rawMinute(clientX)), 0), DAY_MIN)
}

function zoom(factor: number, anchor = (view.value.from + view.value.to) / 2) {
  view.value = zoomView(view.value, factor, anchor)
}

/** Ctrl/Cmd + wheel or pinch = zoom around the pointer; horizontal scroll/Shift + wheel = pan */
function rad(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    zoom(Math.exp(e.deltaY * 0.002), rawMinute(e.clientX))
    return
  }
  const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX
  if (!dx) return // normal scrolling stays with the page
  e.preventDefault()
  view.value = shiftView(view.value, (dx / track.value!.clientWidth) * span.value)
}

const scale = computed(() => {
  const step = scaleStep(span.value)
  const label = step === 15 ? 30 : step
  const list: { minute: number, label?: string }[] = []
  for (let m = Math.ceil(view.value.from / step) * step; m <= view.value.to; m += step) {
    list.push({ minute: m, label: m % label === 0 ? (label === 60 ? formatTime(m).slice(0, 2) : formatTime(m)) : undefined })
  }
  return list
})

const visibleBlocks = computed(() => props.blocks.filter(b => b.end > view.value.from && b.start < view.value.to))

// --- Dragging -------------------------------------------------------------
type Move
  = | { kind: 'create', anchor: number, current: number }
    | { kind: 'move' | 'left' | 'right', block: TimelineBlock, startMinute: number, current: number, moved: boolean }
    | { kind: 'pan', startX: number, startView: View }

const drag = ref<Move | null>(null)

/** Preview range of the current drag */
const preview = computed<(TimeRange & { id?: number }) | null>(() => {
  const z = drag.value
  if (!z) return null
  if (z.kind === 'pan') return null
  if (z.kind === 'create') {
    if (z.current === z.anchor) return null
    return { start: Math.min(z.anchor, z.current), end: Math.max(z.anchor, z.current) }
  }
  const b = z.block
  const delta = z.current - z.startMinute
  if (z.kind === 'move') {
    const duration = b.end - b.start
    const start = Math.min(Math.max(b.start + delta, 0), DAY_MIN - duration)
    return { id: b.id, start, end: start + duration }
  }
  if (z.kind === 'left') return { id: b.id, start: Math.min(b.start + delta, b.end - GRID_MIN), end: b.end }
  return { id: b.id, start: b.start, end: Math.max(b.end + delta, b.start + GRID_MIN) }
})

const previewCollides = computed(() => {
  const v = preview.value
  return !!v && !!findOverlap(props.blocks, v, v.id)
})

function trackPointerDown(e: PointerEvent) {
  // Middle mouse button: pan the view (also over blocks)
  if (e.button === 1) {
    e.preventDefault() // no autoscroll
    drag.value = { kind: 'pan', startX: e.clientX, startView: { ...view.value } }
    track.value!.setPointerCapture(e.pointerId)
    return
  }
  if (e.button !== 0 || e.target !== track.value) return
  const m = minuteAt(e.clientX)
  drag.value = { kind: 'create', anchor: m, current: m }
  track.value!.setPointerCapture(e.pointerId)
}

function blockPointerDown(e: PointerEvent, block: TimelineBlock) {
  if (e.button !== 0) return // middle button bubbles to the track (panning)
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const kind = x < EDGE_PX ? 'left' : x > rect.width - EDGE_PX ? 'right' : 'move'
  const m = minuteAt(e.clientX)
  drag.value = { kind, block, startMinute: m, current: m, moved: false }
  track.value!.setPointerCapture(e.pointerId)
}

function pointerMove(e: PointerEvent) {
  const z = drag.value
  if (!z) return
  if (z.kind === 'pan') {
    const delta = ((z.startX - e.clientX) / track.value!.clientWidth) * (z.startView.to - z.startView.from)
    view.value = shiftView(z.startView, delta)
    return
  }
  const m = minuteAt(e.clientX)
  if (m === z.current) return
  z.current = m
  if (z.kind !== 'create') z.moved = true
}

function pointerUp() {
  const z = drag.value
  const v = preview.value
  const collides = previewCollides.value
  drag.value = null
  if (!z || z.kind === 'pan') return

  if (z.kind !== 'create' && !z.moved) {
    emit('open', z.block)
    return
  }
  if (!v || collides) return
  if (z.kind === 'create') emit('create', { start: v.start, end: v.end })
  else if (v.start !== z.block.start || v.end !== z.block.end) emit('change', z.block.id, { start: v.start, end: v.end })
}

// --- Right-click menu ---------------------------------------------------
const menuMinute = ref(0)

function openMenu(e: MouseEvent) {
  menuMinute.value = minuteAt(e.clientX)
}

// --- Drop from the tasks-in-progress widget or the reminder list -------------------
function drop(e: DragEvent) {
  const minute = minuteAt(e.clientX)
  const taskId = Number(e.dataTransfer?.getData(DRAG_TASK))
  if (taskId) return emit('drop', taskId, minute)
  const todoId = Number(e.dataTransfer?.getData(DRAG_REMINDER))
  if (todoId) emit('dropReminder', todoId, minute)
}

function isDroppable(e: DragEvent) {
  const types = e.dataTransfer?.types ?? []
  return types.includes(DRAG_TASK) || types.includes(DRAG_REMINDER)
}

// --- Appearance --------------------------------------------------------
function blockCssClasses(b: TimelineBlock) {
  return cn(
    b.kind === 'pause' ? 'bg-muted text-muted-foreground ring-1 ring-inset ring-border' : accountColorClasses(b.accountColor).surface,
    // Planned: dashed border (instead of ring) + hatching
    b.status === 'geplant' && 'hatched border border-dashed ring-0',
    drag.value && 'block' in drag.value && drag.value.block.id === b.id && 'opacity-30',
  )
}

/** Border color of dashed (planned) blocks in the account color, otherwise line color */
function blockStyle(b: TimelineBlock) {
  if (b.status !== 'geplant') return position(b)
  const color = b.kind === 'pause' || !b.accountColor ? 'var(--color-border)' : `color-mix(in oklch, var(--color-konto-${b.accountColor}) 55%, transparent)`
  return { ...position(b), borderColor: color }
}

function position(z: TimeRange) {
  const links = percent(z.start)
  return { left: `${links}%`, width: `${Math.max(percent(z.end) - links, 0)}%` }
}
</script>

<template>
  <section
    class="select-none"
    :class="!compact && 'overflow-hidden rounded-xl border bg-background'"
    :aria-label="compact ? undefined : 'Zeitleiste'"
  >
    <!-- Header strip with zoom controls -->
    <div v-if="!compact" class="flex min-h-11 items-center justify-between gap-2 border-b bg-card px-4">
      <span class="text-sm font-semibold">Zeitleiste</span>
      <div class="flex items-center gap-1">
        <span class="mr-2 font-mono text-xs text-muted-foreground">{{ formatTime(Math.round(view.from)) }}–{{ formatTime(Math.round(view.to)) }}</span>
        <Button size="icon-sm" variant="ghost" class="size-7" aria-label="Herauszoomen" @click="zoom(1.5)">
          <Minus />
        </Button>
        <Button size="icon-sm" variant="ghost" class="size-7" aria-label="Hineinzoomen" @click="zoom(1 / 1.5)">
          <Plus />
        </Button>
        <Button size="icon-sm" variant="ghost" class="size-7" aria-label="Zoom zurücksetzen" :disabled="isDefaultView" @click="resetView">
          <RotateCcw />
        </Button>
      </div>
    </div>

    <div :class="!compact && 'px-4 pt-3 pb-4'">
      <!-- Scale -->
      <div class="relative h-[18px] overflow-hidden font-mono text-[11px] text-muted-foreground">
        <span
          v-for="s in scale.filter(s => s.label)"
          :key="s.minute"
          class="absolute -translate-x-1/2"
          :style="{ left: `${percent(s.minute)}%` }"
        >{{ s.label }}</span>
      </div>

      <div
        ref="track"
        class="relative cursor-crosshair touch-none overflow-hidden rounded-md border bg-card"
        :class="compact ? 'h-14' : 'h-22'"
        title="Strg + Mausrad: zoomen · Shift + Mausrad / mittlere Maustaste: verschieben"
        @pointerdown="trackPointerDown"
        @pointermove="pointerMove"
        @pointerup="pointerUp"
        @pointercancel="drag = null"
        @wheel="rad"
        @dragover="isDroppable($event) && $event.preventDefault()"
        @drop.prevent="drop"
      >
        <!-- Hour lines -->
        <div
          v-for="s in scale"
          :key="s.minute"
          class="pointer-events-none absolute inset-y-0 w-px"
          :class="s.label ? 'bg-border' : 'bg-border/40'"
          :style="{ left: `${percent(s.minute)}%` }"
        />

        <!-- Blocks -->
        <ContextMenu v-for="b in visibleBlocks" :key="b.id">
          <ContextMenuTrigger as-child>
            <div
              class="absolute flex cursor-grab flex-col justify-center overflow-hidden rounded-[6px] px-2 active:cursor-grabbing"
              :class="[compact ? 'inset-y-1.5' : 'inset-y-2', blockCssClasses(b)]"
              :style="blockStyle(b)"
              :title="`${blockTitle(b)}${b.templateName ? ` (${b.taskTitle ?? b.accountName})` : ''} · ${formatTime(b.start)}–${formatTime(b.end)}${b.note ? ` · ${b.note}` : ''}`"
              @pointerdown="blockPointerDown($event, b)"
              @contextmenu="openMenu"
            >
              <span class="absolute inset-y-0 left-0 w-2 cursor-ew-resize" />
              <span class="truncate text-xs leading-4 font-semibold">{{ blockTitle(b) }}</span>
              <span class="truncate font-mono text-[11px] leading-4 text-muted-foreground">{{ formatTime(b.start) }}–{{ formatTime(b.end) }}</span>
              <span class="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem @select="emit('menu', 'toggle', b, menuMinute)">
              {{ b.status === 'geplant' ? 'Buchen' : 'Als geplant markieren' }}
            </ContextMenuItem>
            <ContextMenuItem @select="emit('menu', 'split', b, menuMinute)">
              Hier teilen
            </ContextMenuItem>
            <ContextMenuItem @select="emit('menu', 'edit', b, menuMinute)">
              Aufgabe/Konto ändern …
            </ContextMenuItem>
            <ContextMenuItem v-if="b.kind === 'arbeit' && !b.templateId" @select="emit('menu', 'recurring', b, menuMinute)">
              Als wiederkehrend speichern …
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" @select="emit('menu', 'delete', b, menuMinute)">
              Löschen
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <!-- Preview while dragging -->
        <div
          v-if="preview"
          class="pointer-events-none absolute inset-y-1 rounded-[6px] border-2 border-dashed"
          :class="previewCollides ? 'border-destructive bg-destructive/15' : 'border-primary bg-primary/15'"
          :style="position(preview)"
        >
          <span class="absolute -top-0.5 left-1 font-mono text-[10px]">
            {{ formatTime(preview.start) }}–{{ formatTime(preview.end) }}
          </span>
        </div>

        <!-- Now line -->
        <div
          v-if="currentMinute !== undefined && currentMinute >= view.from && currentMinute <= view.to"
          class="pointer-events-none absolute inset-y-0 w-0.5 bg-primary"
          :style="{ left: `${percent(currentMinute)}%` }"
        />
      </div>

      <!-- Content below the track (e.g. progress on the today page) -->
      <slot />
    </div>
  </section>
</template>
