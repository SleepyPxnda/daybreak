<script setup lang="ts">
import { format, getDaysInMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import type { DayInfo } from '#shared/utils/target'

const props = defineProps<{
  year: number
  /** 1 … 12 */
  month: number
  infos: Map<string, DayInfo & { note: string | null, targetOverride: number | null, blocker: boolean, confirmed: boolean }>
  selection: { from: string, to: string } | null
}>()

const emit = defineEmits<{
  start: [date: string]
  expand: [date: string]
}>()

const first = computed(() => `${props.year}-${String(props.month).padStart(2, '0')}-01`)
const empty = computed(() => weekday(first.value) - 1)
const days = computed(() => {
  const count = getDaysInMonth(toDate(first.value))
  return Array.from({ length: count }, (_, i) => addDays(first.value, i))
})

const todayDate = today()

// Categories as tinted area + border in the category color (tokens), text always ink
const HALF_VACATION = 'bg-[linear-gradient(135deg,color-mix(in_oklch,var(--account-mint)_35%,transparent)_50%,transparent_50%)] ring-1 ring-inset ring-account-mint'
const TYPE_CLASSES: Record<string, string> = {
  vacation: 'bg-account-mint/35 ring-1 ring-inset ring-account-mint',
  half_vacation: HALF_VACATION,
  sick: 'bg-account-peach/35 ring-1 ring-inset ring-account-peach',
  flex_day: 'bg-account-sky/35 ring-1 ring-inset ring-account-sky',
}

/** Color by day type (stored on workdays only), holidays outlined, weekend dimmed; today and selection override the category */
function cssClasses(date: string) {
  const info = props.infos.get(date)
  const selection = props.selection
  const selected = !!selection && date >= selection.from && date <= selection.to
  if (date === todayDate) return ['bg-primary font-medium text-primary-foreground', selected && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background']
  if (selected) return ['bg-primary/12 text-primary ring-1 ring-primary ring-inset']
  const list: string[] = []
  if (info?.holiday) list.push('text-foreground ring-1 ring-muted-foreground ring-inset')
  else list.push(info?.isWorkday ? 'text-foreground' : 'text-line-strong')
  if (info?.isWorkday) {
    // Unconfirmed vacation: dashed border only, confirmed: tinted area
    const open = (info.type === 'vacation' || info.type === 'half_vacation') && !info.confirmed
    const type = open ? 'border border-dashed border-account-mint' : TYPE_CLASSES[info.type]
    if (type) list.push(type)
    if (info.blocker) list.push('blocker-hatched')
  }
  if (list.length === 1) list.push('hover:bg-muted')
  return list
}

const TYPE: Record<string, string> = { vacation: 'Urlaub', half_vacation: '½ Urlaub', sick: 'Krank', flex_day: 'Gleittag' }

function title(date: string) {
  const info = props.infos.get(date)
  const split = [format(toDate(date), 'EEEE, d. MMMM', { locale: de })]
  if (info?.holiday) split.push(info.holiday)
  if (info?.isWorkday && info.type !== 'work') {
    const unconfirmed = (info.type === 'vacation' || info.type === 'half_vacation') && !info.confirmed
    split.push(`${TYPE[info.type] ?? info.type}${unconfirmed ? ' (unbestätigt)' : ''}`)
  }
  if (info?.isWorkday && info.blocker) split.push('Blocker – kein Urlaub')
  if (info?.targetOverride != null) split.push(`Soll ${formatDuration(info.targetOverride)}`)
  if (info?.note) split.push(info.note)
  return split.join(' · ')
}

function hasOverride(date: string) {
  return props.infos.get(date)?.targetOverride != null
}
</script>

<template>
  <div class="select-none">
    <div class="mb-1.5 text-sm font-semibold">
      {{ format(toDate(first), 'MMMM', { locale: de }) }}
    </div>
    <div class="grid grid-cols-7 gap-0.5 text-center font-mono text-xs tabular-nums">
      <span v-for="w in WEEKDAYS" :key="w.nr" class="mb-0.5 text-[11px] text-muted-foreground">{{ w.short.slice(0, 2) }}</span>
      <span v-for="i in empty" :key="`blank-${i}`" />
      <button
        v-for="d in days"
        :key="d"
        type="button"
        class="relative h-7 rounded-[6px] leading-none transition-colors"
        :class="cssClasses(d)"
        :title="title(d)"
        @pointerdown.prevent="emit('start', d)"
        @pointerenter="emit('expand', d)"
      >
        {{ Number(d.slice(8)) }}
        <span v-if="hasOverride(d)" class="absolute right-0.5 bottom-0.5 size-1 rounded-full" :class="d === todayDate ? 'bg-primary-foreground' : 'bg-primary'" />
      </button>
    </div>
  </div>
</template>
