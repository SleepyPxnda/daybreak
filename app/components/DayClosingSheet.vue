<script setup lang="ts">
import { Check, Plus, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { parseDuration } from '#shared/utils/quickInput'
import type { TimelineBlock } from '~/utils/timeline'

// Day closing: gap to target, adopt planned blocks, one-click suggestions
const props = defineProps<{
  date: string
  blocks: TimelineBlock[]
  target: number
}>()
const open = defineModel<boolean>('open', { default: false })

const actual = computed(() => actualMinutes(props.blocks))
const gap = computed(() => props.target - actual.value)
const planned = computed(() => props.blocks.filter(b => b.status === 'geplant'))

const { data: suggestions } = useFetch('/api/blocks/recent', {
  key: 'recent',
  query: { date: toRef(props, 'date') },
  default: () => [],
})

const durationText = ref('')
watch(open, (nowOpen) => {
  if (nowOpen) durationText.value = gap.value > 0 ? formatDuration(gap.value).replace(':', 'h') : '30m'
})
const duration = computed(() => parseDuration(durationText.value))

async function bookPlanned(ids?: number[]) {
  await runAction(() => api('/api/blocks/book-planned', { method: 'POST', body: { date: props.date, ids } }), DAY_KEYS)
}

async function book(v: { taskId: number | null, accountId: number | null }) {
  if (!duration.value || duration.value % GRID_MIN !== 0) return void toast.error('Dauer im 15-min-Raster angeben, z. B. 1h30 oder 45m')
  await runAction(() => api('/api/blocks', {
    method: 'POST',
    body: { date: props.date, kind: 'arbeit', status: 'gebucht', duration: duration.value, ...(v.taskId ? { taskId: v.taskId } : { accountId: v.accountId }) },
  }), DAY_KEYS)
}

function chipText(v: { taskKey: string | null, taskTitle: string | null, accountName: string | null }) {
  return v.taskTitle ? `${v.taskKey ? `${v.taskKey} ` : ''}${v.taskTitle}` : (v.accountName ?? '')
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="w-full gap-0 sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Tagesabschluss</SheetTitle>
        <SheetDescription class="tabular-nums">
          Gebucht {{ formatDuration(actual) }} von {{ formatDuration(target) }}
        </SheetDescription>
      </SheetHeader>

      <div class="grid gap-6 overflow-y-auto px-4 pb-6">
        <div class="rounded-xl border bg-card p-4 text-center tabular-nums">
          <template v-if="gap > 0">
            <div class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <TriangleAlert class="size-3.5 text-negativ" /> Lücke zum Soll
            </div>
            <div class="text-2xl font-semibold text-negativ">
              {{ formatBalance(-gap) }}
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Check class="size-3.5 text-positiv" /> Soll erreicht
            </div>
            <div class="text-2xl font-semibold text-positiv">
              {{ formatBalance(-gap) }}
            </div>
          </template>
        </div>

        <section class="grid grid-cols-1 gap-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">
              Geplant
            </h3>
            <Button v-if="planned.length" size="sm" @click="bookPlanned()">
              <Check /> Plan übernehmen
            </Button>
          </div>
          <p v-if="!planned.length" class="text-sm text-muted-foreground">
            Keine geplanten Blöcke.
          </p>
          <div v-for="b in planned" :key="b.id" class="flex min-h-10 items-center gap-2.5 rounded-md border bg-card py-1 pr-1 pl-3 text-sm">
            <span class="size-2 shrink-0 rounded-full" :class="b.kind === 'pause' ? 'bg-muted-foreground' : accountColorClasses(b.accountColor).dot" />
            <span class="fade-end min-w-0 flex-1" :title="blockTitle(b)">{{ blockTitle(b) }}</span>
            <span class="font-mono text-[13px] text-muted-foreground">{{ formatTime(b.start) }}–{{ formatTime(b.end) }}</span>
            <Button size="icon-sm" variant="ghost" aria-label="Übernehmen" @click="bookPlanned([b.id])">
              <Check />
            </Button>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-2">
          <h3 class="text-sm font-semibold">
            Schnell buchen
          </h3>
          <div class="flex items-center gap-2">
            <Label for="closing-duration" class="font-normal text-muted-foreground">Dauer</Label>
            <Input id="closing-duration" v-model="durationText" class="w-24 font-mono" />
            <span class="font-mono text-[13px] text-muted-foreground">{{ duration ? formatDuration(duration) : '' }}</span>
          </div>
          <p v-if="!suggestions.length" class="text-sm text-muted-foreground">
            Noch keine Buchungen in den letzten 14 Tagen.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="v in suggestions"
              :key="`${v.taskId}-${v.accountId}`"
              type="button"
              class="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition hover:brightness-125"
              :class="accountColorClasses(v.accountColor).surface"
              :title="chipText(v)"
              @click="book(v)"
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
