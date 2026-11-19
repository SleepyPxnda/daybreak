<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ClipboardCheck, Copy, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import DayTimeline from '~/components/timeline/DayTimeline.vue'
import BlockDialog from '~/components/timeline/BlockDialog.vue'
import QuickInput from '~/components/quick-input/QuickInput.vue'
import DaySetting from '~/components/widgets/DaySetting.vue'
import TasksInProgress from '~/components/widgets/TasksInProgress.vue'
import TodoColumn from '~/components/widgets/TodoColumn.vue'
import PinnedNotes from '~/components/widgets/PinnedNotes.vue'
import NextVacation from '~/components/widgets/NextVacation.vue'

const route = useRoute()
const date = computed(() => {
  const d = String(route.query.date ?? '')
  return isIsoDate(d) ? d : today()
})
const isToday = computed(() => date.value === today())

useHead({ title: () => `${isToday.value ? 'Heute' : format(toDate(date.value), 'EEE d. MMM', { locale: de })} · daybreak` })

const { data: settings } = useSettings()
const { blocks, conflicts, info } = useDay(date)

const from = computed(() => settings.value?.timelineVon ?? 420)
const to = computed(() => settings.value?.timelineBis ?? 1140)

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

const actual = computed(() => actualMinutes(blocks.value))
const planned = computed(() => plannedMinutes(blocks.value))
const target = computed(() => info.value?.target ?? 0)
const progress = computed(() => (target.value ? Math.min(100, Math.round((actual.value / target.value) * 100)) : 0))

function switchDay(days: number) {
  const destination = addDays(date.value, days)
  navigateTo({ query: destination === today() ? {} : { date: destination } })
}

// --- Same as yesterday / day closing --------------------------------------
async function copyYesterday() {
  const r = await runAction(() => api<{ source: string | null, created: unknown[], skipped: number }>(
    '/api/blocks/copy-yesterday', { method: 'POST', body: { date: date.value } },
  ), DAY_KEYS)
  if (!r) return
  if (!r.source) return void toast.info('Keine gebuchten Blöcke in den letzten 7 Tagen gefunden.')
  toast.success(`${r.created.length} Blöcke vom ${format(toDate(r.source), 'EEE d.M.', { locale: de })} als geplant übernommen${r.skipped ? ` (${r.skipped} übersprungen – Zeit belegt)` : ''}.`)
}

const closing = ref(false)
// Clicking the end-of-day notification opens the day closing via ?dayClosing=1
watch(() => route.query.dayClosing, (value) => {
  if (value === undefined) return
  closing.value = true
  navigateTo({ query: {} }, { replace: true })
}, { immediate: true })
</script>

<template>
  <div class="grid gap-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <Button size="icon" variant="ghost" aria-label="Vorheriger Tag" @click="switchDay(-1)">
        <ChevronLeft />
      </Button>
      <!-- Fixed width so the arrows do not jump while paging (longest date fits) -->
      <div class="w-60 shrink-0">
        <h1 class="truncate text-2xl font-semibold tracking-tight">
          {{ isToday ? 'Heute' : format(toDate(date), 'EEEE', { locale: de }) }}
        </h1>
        <p class="truncate text-sm text-muted-foreground">
          {{ format(toDate(date), 'EEEE, d. MMMM yyyy', { locale: de }) }}
        </p>
      </div>
      <Button size="icon" variant="ghost" aria-label="Nächster Tag" @click="switchDay(1)">
        <ChevronRight />
      </Button>
      <!-- Always in the layout, just invisible - otherwise the rest shifts -->
      <Button size="sm" variant="ghost" :class="{ invisible: isToday }" :tabindex="isToday ? -1 : 0" @click="navigateTo({ query: {} })">
        Heute
      </Button>
      <div class="grow" />
      <DaySetting
        v-if="info"
        :date="date"
        :type="info.type"
        :target="info.target"
        :holiday="info.holiday"
        :is-workday="info.isWorkday"
        :note="info.note"
      />
    </div>

    <div v-if="conflicts.length" class="flex flex-wrap gap-3">
      <NextVacation presentation="banner" class="flex-[1_1_420px]" />
      <div class="flex items-center gap-2.5 rounded-xl border bg-warnung-subtle px-4 py-2.5 text-sm">
        <TriangleAlert class="size-[18px] shrink-0 text-warnung" />
        <span>
          <span class="font-semibold text-warnung">{{ conflicts.length }} wiederkehrende{{ conflicts.length === 1 ? 'r Block' : ' Blöcke' }}</span>
          nicht eingetragen – Zeitraum belegt
        </span>
      </div>
    </div>
    <NextVacation v-else presentation="banner" />

    <!-- Timeline with progress -->
    <DayTimeline
      :blocks="blocks"
      :from="from"
      :to="to"
      :current-minute="isToday ? currentMinute : undefined"
      @create="create(date, $event)"
      @change="change"
      @open="open"
      @menu="menu"
      @drop="(id, start) => drop(date, id, start)"
      @drop-reminder="(id, start) => dropReminder(date, id, start)"
    >
      <div class="mt-4 flex items-center gap-3 text-sm">
        <span>Gebucht <span class="font-mono font-medium">{{ formatDuration(actual) }}</span> <span class="font-mono text-muted-foreground">/ {{ formatDuration(target) }}</span></span>
        <Progress :model-value="progress" class="flex-1" />
        <span class="text-[13px] text-muted-foreground">geplant <span class="font-mono">{{ formatDuration(planned) }}</span></span>
      </div>
    </DayTimeline>

    <QuickInput :date="date">
      <Button variant="outline" class="h-11" @click="copyYesterday">
        <Copy /> Wie gestern
      </Button>
      <Button class="h-11" @click="closing = true">
        <ClipboardCheck /> Tagesabschluss
      </Button>
    </QuickInput>

    <!-- Cards below the timeline: tasks in progress, reminders, follow-ups, daily topics -->
    <section class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-6">
      <TasksInProgress :date="date" />
      <TodoColumn />
      <PinnedNotes />
      <NextVacation presentation="karte" />
    </section>

    <BlockDialog v-model:open="blockDialog" :block="editedBlock" :draft="draft" />
    <TemplateDialog v-model:open="templateDialog" :template="templateDraft" />
    <DayClosingSheet v-model:open="closing" :date="date" :blocks="blocks" :target="target" />
  </div>
</template>
