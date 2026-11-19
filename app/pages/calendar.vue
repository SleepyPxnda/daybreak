<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useEventListener } from '@vueuse/core'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import type { DayType } from '#shared/utils/target'
import MiniMonth from '~/components/calendar/MiniMonth.vue'
import VacationCard from '~/components/widgets/VacationCard.vue'

// Calendar: year view, holidays (Baden-Wuerttemberg), absences; range selection sets the day type
const route = useRoute()
const currentYear = Number(today().slice(0, 4))
const year = computed(() => Number(route.query.year) || currentYear)

useHead({ title: () => `Kalender ${year.value} · daybreak` })

const { data: days } = useFetch('/api/days', {
  key: 'calendar-days',
  query: { from: computed(() => `${year.value}-01-01`), to: computed(() => `${year.value}-12-31`) },
  default: () => [],
})
const infos = computed(() => new Map(days.value.map(t => [t.date, t])))

function yearSwitch(delta: number) {
  const destination = year.value + delta
  selection.value = null
  navigateTo({ query: destination === currentYear ? {} : { year: destination } })
}

// --- Range selection via click/drag -------------------------------------
const anchor = ref<string | null>(null)
const end = ref<string | null>(null)
const isDragging = ref(false)
const selection = computed({
  get: () => (anchor.value && end.value
    ? { from: anchor.value < end.value ? anchor.value : end.value, to: anchor.value < end.value ? end.value : anchor.value }
    : null),
  set: (value: null) => {
    anchor.value = value
    end.value = value
  },
})

function start(date: string) {
  anchor.value = date
  end.value = date
  isDragging.value = true
}
function expand(date: string) {
  if (isDragging.value) end.value = date
}
useEventListener('pointerup', () => { isDragging.value = false })
useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') selection.value = null
})

const selectionText = computed(() => {
  const a = selection.value
  if (!a) return ''
  const f = (d: string) => format(toDate(d), 'EEE d. MMM', { locale: de })
  return a.from === a.to ? f(a.from) : `${f(a.from)} – ${f(a.to)}`
})
const workdaysSelection = computed(() => {
  const a = selection.value
  if (!a) return []
  return dateRange(a.from, a.to).filter(d => infos.value.get(d)?.isWorkday)
})
const workdaysInSelection = computed(() => workdaysSelection.value.length)
// Blocker: hint not to take vacation here - separate switch, independent of the day type
const blockerInSelection = computed(() => workdaysSelection.value.filter(d => infos.value.get(d)?.blocker).length)
const allBlocked = computed(() => workdaysInSelection.value > 0 && blockerInSelection.value === workdaysInSelection.value)

async function setBlocker() {
  const a = selection.value
  if (!a) return
  const ok = await runAction(() => api('/api/days/range', { method: 'PUT', body: { ...a, blocker: !allBlocked.value } }), DAY_KEYS)
  if (ok) selection.value = null
}

const TYPES: { type: DayType, label: string }[] = [
  { type: 'vacation', label: 'Urlaub' },
  { type: 'half_vacation', label: '½ Urlaub' },
  { type: 'sick', label: 'Krank' },
  { type: 'flex_day', label: 'Gleittag' },
  { type: 'work', label: 'Zurücksetzen' },
]

async function set(type: DayType) {
  const a = selection.value
  if (!a) return
  const ok = await runAction(() => api('/api/days/range', { method: 'PUT', body: { ...a, type } }), DAY_KEYS)
  if (ok) selection.value = null
}
</script>

<template>
  <div class="grid gap-8 xl:grid-cols-[1fr_18rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Vorheriges Jahr" @click="yearSwitch(-1)">
            <ChevronLeft />
          </Button>
          <h1 class="w-20 text-center font-mono text-2xl font-medium tracking-tight tabular-nums">
            {{ year }}
          </h1>
          <Button size="icon" variant="ghost" aria-label="Nächstes Jahr" @click="yearSwitch(1)">
            <ChevronRight />
          </Button>
        </div>
        <!-- Legend -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-account-mint/35 ring-1 ring-account-mint ring-inset" /> Urlaub</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-[linear-gradient(135deg,color-mix(in_oklch,var(--account-mint)_35%,transparent)_50%,transparent_50%)] ring-1 ring-account-mint ring-inset" /> ½ Urlaub</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm border border-dashed border-account-mint" /> unbestätigt</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-account-peach/35 ring-1 ring-account-peach ring-inset" /> Krank</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-account-sky/35 ring-1 ring-account-sky ring-inset" /> Gleittag</span>
          <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm ring-1 ring-muted-foreground ring-inset" /> Feiertag</span>
          <span class="flex items-center gap-1.5"><span class="blocker-hatched size-3 rounded-sm" /> Blocker</span>
          <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-primary" /> Soll abweichend</span>
        </div>
      </div>

      <!-- Action bar for the selection -->
      <div class="sticky top-2 z-10 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border bg-popover py-2 pr-2 pl-4 text-sm">
        <template v-if="selection">
          <span class="font-semibold">{{ selectionText }}</span>
          <span class="font-mono text-[13px] text-muted-foreground">{{ workdaysInSelection }} Arbeitstag{{ workdaysInSelection === 1 ? '' : 'e' }}</span>
          <span v-if="blockerInSelection" class="flex items-center gap-1.5 text-[13px] text-negative">
            <span class="blocker-hatched size-3 rounded-sm" />
            {{ blockerInSelection }} Blocker-Tag{{ blockerInSelection === 1 ? '' : 'e' }} – hier besser kein Urlaub
          </span>
          <span class="flex-1" />
          <Button
            v-for="t in TYPES"
            :key="t.type"
            size="sm"
            :variant="t.type === 'vacation' ? 'default' : t.type === 'work' ? 'ghost' : 'outline'"
            @click="set(t.type)"
          >
            {{ t.label }}
          </Button>
          <Button size="sm" variant="outline" :disabled="!workdaysInSelection" @click="setBlocker">
            <span class="blocker-hatched size-3 rounded-sm" />
            {{ allBlocked ? 'Blocker entfernen' : 'Blocker' }}
          </Button>
          <Button v-if="selection.from === selection.to" size="sm" variant="ghost" @click="navigateTo(`/?date=${selection.from}`)">
            Tag öffnen
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Auswahl aufheben" @click="selection = null">
            <X />
          </Button>
        </template>
        <span v-else class="text-muted-foreground">Tag anklicken oder über mehrere Tage ziehen, um Urlaub, Krank, Gleittag oder einen Blocker zu setzen.</span>
      </div>

      <div class="grid grid-cols-2 gap-x-7 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">
        <MiniMonth
          v-for="m in 12"
          :key="m"
          :year="year"
          :month="m"
          :infos="infos"
          :selection="selection"
          @start="start"
          @expand="expand"
        />
      </div>
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <VacationCard :year="year" />
    </aside>
  </div>
</template>
