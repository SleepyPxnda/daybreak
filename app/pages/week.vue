<script setup lang="ts">
import { format, getISOWeek, startOfISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TriangleAlert } from '@lucide/vue'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import TasksInProgress from '~/components/widgets/TasksInProgress.vue'
import type { TimelineBlock } from '~/utils/timeline'

// Week: 5 or 7 timelines stacked, planning via drag & drop, day and week totals
const route = useRoute()

const todayDate = useToday()
const monday = computed(() => {
  const d = String(route.query.week ?? '')
  return toIsoDate(startOfISOWeek(toDate(isIsoDate(d) ? d : todayDate.value)))
})
const sunday = computed(() => addDays(monday.value, 6))
const kw = computed(() => getISOWeek(toDate(monday.value)))
const isThisWeek = computed(() => monday.value === toIsoDate(startOfISOWeek(toDate(todayDate.value))))

useHead({ title: () => `KW ${kw.value} · daybreak` })

const { data: settings } = useSettings()
const from = computed(() => settings.value?.timelineFrom ?? 420)
const to = computed(() => settings.value?.timelineTo ?? 1140)

const range = { from: monday, to: sunday }
const { data: blocksResponse } = useFetch('/api/blocks', {
  key: 'week-blocks',
  query: range,
  default: () => ({ blocks: [] as TimelineBlock[], conflicts: [] as { templateId: number, date: string }[] }),
})
const { data: dayInfos } = useFetch('/api/days', { key: 'week-days', query: range, default: () => [] })

const {
  currentMinute,
  blockDialog,
  editedBlock,
  draft,
  templateDialog,
  templateDraft,
  create,
  open,
  change,
  menu,
  drop,
  dropReminder,
} = useBlockEditing()

// Show the weekend only if wanted or if something is scheduled there
const withWeekend = ref(false)

const days = computed(() => {
  const all = (blocksResponse.value.blocks as TimelineBlock[])
  return dateRange(monday.value, sunday.value).map((date) => {
    const blocks = all.filter(b => b.date === date)
    const info = dayInfos.value.find(t => t.date === date)
    return {
      date,
      blocks,
      info,
      actual: actualMinutes(blocks),
      planned: plannedMinutes(blocks),
      target: info?.target ?? 0,
      conflicts: blocksResponse.value.conflicts.filter(k => k.date === date).length,
      isWeekend: weekday(date) >= 6,
    }
  })
})
const weekendHasContent = computed(() => days.value.some(t => t.isWeekend && (t.blocks.length || t.target)))
const visibleDays = computed(() => days.value.filter(t => !t.isWeekend || withWeekend.value || weekendHasContent.value))

const sum = computed(() => ({
  actual: days.value.reduce((s, t) => s + t.actual, 0),
  planned: days.value.reduce((s, t) => s + t.planned, 0),
  target: days.value.reduce((s, t) => s + t.target, 0),
}))

function weekSwitch(weeks: number) {
  const destination = addDays(monday.value, weeks * 7)
  navigateTo({ query: destination === toIsoDate(startOfISOWeek(toDate(todayDate.value))) ? {} : { week: destination } })
}

const TYPE_LABELS: Record<string, string> = { vacation: 'Urlaub', half_vacation: '½ Urlaub', sick: 'Krank', flex_day: 'Gleittag' }
function dayLabel(info?: { holiday?: string, type: string, isWorkday: boolean }) {
  if (!info) return undefined
  if (info.holiday) return info.holiday
  if (info.isWorkday && info.type !== 'work') return TYPE_LABELS[info.type]
  return undefined
}
</script>

<template>
  <div class="grid items-start gap-8 xl:grid-cols-[1fr_18rem]">
    <div class="grid min-w-0 grid-cols-1 content-start gap-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3">
        <Button size="icon" variant="ghost" aria-label="Vorherige Woche" @click="weekSwitch(-1)">
          <ChevronLeft />
        </Button>
        <div class="w-52 shrink-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            KW {{ kw }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ format(toDate(monday), 'd. MMM', { locale: de }) }} – {{ format(toDate(sunday), 'd. MMM yyyy', { locale: de }) }}
          </p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Nächste Woche" @click="weekSwitch(1)">
          <ChevronRight />
        </Button>
        <Button size="sm" variant="ghost" :class="{ invisible: isThisWeek }" :tabindex="isThisWeek ? -1 : 0" @click="navigateTo({ query: {} })">
          Diese Woche
        </Button>
        <div class="grow" />
        <div class="flex items-center gap-2">
          <Switch id="weekend" v-model="withWeekend" :disabled="weekendHasContent" />
          <Label for="weekend" class="font-normal text-muted-foreground">Wochenende</Label>
        </div>
        <div class="flex h-8 items-center gap-2 rounded-full border px-3 font-mono text-[13px] text-muted-foreground">
          <span>Woche <span class="text-foreground">{{ formatDuration(sum.actual) }}</span> / {{ formatDuration(sum.target) }}</span>
          <span :class="sum.actual - sum.target >= 0 ? 'text-positive' : 'text-negative'">{{ formatBalance(sum.actual - sum.target) }}</span>
          <span>· geplant {{ formatDuration(sum.planned) }}</span>
        </div>
      </div>

      <!-- Days -->
      <div class="grid gap-2">
        <div v-for="t in visibleDays" :key="t.date" class="flex items-stretch gap-3">
          <div class="flex w-30 shrink-0 flex-col justify-end gap-0.5 pb-1">
            <NuxtLink
              :to="t.date === today() ? '/' : `/?date=${t.date}`"
              class="text-sm font-semibold hover:underline"
              :class="t.date === today() ? 'text-primary' : 'text-foreground'"
            >
              {{ format(toDate(t.date), 'EEE, d.M.', { locale: de }) }}
            </NuxtLink>
            <span class="font-mono text-xs text-muted-foreground">
              <span class="text-foreground">{{ formatDuration(t.actual) }}</span> / {{ formatDuration(t.target) }}
            </span>
            <span v-if="t.planned" class="font-mono text-xs text-muted-foreground">geplant {{ formatDuration(t.planned) }}</span>
            <Badge v-if="dayLabel(t.info)" variant="secondary" class="w-fit">
              {{ dayLabel(t.info) }}
            </Badge>
            <span v-if="t.conflicts" class="flex items-start gap-1 text-xs text-warning">
              <TriangleAlert class="mt-px size-3.5 shrink-0" />
              {{ t.conflicts }} Vorlage(n) nicht eingetragen – belegt
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <DayTimeline
              :blocks="t.blocks"
              :from="from"
              :to="to"
              :current-minute="t.date === today() ? currentMinute : undefined"
              compact
              @create="create(t.date, $event)"
              @change="change"
              @open="open"
              @menu="menu"
              @drop="(id, start) => drop(t.date, id, start)"
              @drop-reminder="(id, start) => dropReminder(t.date, id, start)"
            />
          </div>
        </div>
      </div>
    </div>

    <aside class="grid grid-cols-1 content-start gap-4">
      <TasksInProgress :date="today()" />
      <p class="text-[13px] text-muted-foreground">
        Aufgaben auf einen Tag ziehen, um sie einzuplanen (1 h). Blöcke lassen sich wie auf „Heute“ ziehen, verschieben und per Rechtsklick bearbeiten.
      </p>
    </aside>

    <BlockDialog v-model:open="blockDialog" :block="editedBlock" :draft="draft" />
    <TemplateDialog v-model:open="templateDialog" :template="templateDraft" />
  </div>
</template>
