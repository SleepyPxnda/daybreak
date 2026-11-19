<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight } from '@lucide/vue'

// Overview: booked time grouped account -> task -> days with hours and share per level
const props = defineProps<{ from: string, to: string }>()

const { data: overview } = useFetch('/api/overview', {
  key: 'overview',
  query: { from: toRef(props, 'from'), to: toRef(props, 'to') },
})

// Accounts expanded by default, tasks (day level) collapsed
const collapsedAccounts = ref(new Set<number>())
const openTasks = ref(new Set<string>())
const taskKey = (accountId: number, taskId: number | null) => `${accountId}:${taskId ?? 'ohne'}`
function toggle<T>(amount: Set<T>, value: T) {
  if (amount.has(value)) amount.delete(value)
  else amount.add(value)
}
const allTasksOpen = computed(() => !!overview.value?.accounts.every(k => k.tasks.every(a => openTasks.value.has(taskKey(k.accountId, a.taskId)))))
function allToggle() {
  const accounts = overview.value?.accounts ?? []
  collapsedAccounts.value = new Set()
  openTasks.value = allTasksOpen.value
    ? new Set()
    : new Set(accounts.flatMap(k => k.tasks.map(a => taskKey(k.accountId, a.taskId))))
}

const percent = (share: number) => `${Math.round(share * 100)} %`
const width = (share: number) => ({ width: `${Math.round(share * 100)}%` })
</script>

<template>
  <template v-if="overview">
    <!-- Total -->
    <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Gebucht
        </div>
        <div class="font-mono text-2xl font-medium tabular-nums">
          {{ formatDuration(overview.total) }}
        </div>
      </div>
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Soll
        </div>
        <div class="font-mono text-2xl font-medium text-muted-foreground tabular-nums">
          {{ formatDuration(overview.target) }}
        </div>
      </div>
      <div class="bg-background p-4">
        <div class="text-sm text-muted-foreground">
          Differenz
        </div>
        <div class="font-mono text-2xl font-medium tabular-nums" :class="overview.total - overview.target >= 0 ? 'text-positiv' : 'text-negativ'">
          {{ formatBalance(overview.total - overview.target) }}
        </div>
      </div>
    </div>

    <p v-if="!overview.accounts.length" class="text-sm text-muted-foreground">
      Keine gebuchte Zeit in diesem Zeitraum.
    </p>

    <!-- Account -> task -> days -->
    <section v-else class="min-w-0 overflow-hidden rounded-xl border bg-background text-sm">
      <div class="grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card px-4 text-xs text-muted-foreground">
        <span class="flex items-center justify-between gap-2">
          Konto / Aufgabe
          <Button size="sm" variant="ghost" class="-mr-2 h-7 text-xs" @click="allToggle">
            {{ allTasksOpen ? 'Tage einklappen' : 'Alle Tage zeigen' }}
          </Button>
        </span>
        <span class="text-right">Stunden</span><span>Anteil</span>
      </div>

      <div v-for="k in overview.accounts" :key="k.accountId">
        <button
          type="button"
          class="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b px-4 text-left hover:bg-raised"
          :aria-expanded="!collapsedAccounts.has(k.accountId)"
          @click="toggle(collapsedAccounts, k.accountId)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': !collapsedAccounts.has(k.accountId) }" />
            <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(k.color).dot" />
            <span class="truncate font-semibold">{{ k.name }}</span>
          </span>
          <span class="text-right font-mono tabular-nums">{{ formatDuration(k.minutes) }}</span>
          <span class="flex items-center gap-2">
            <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span class="block h-full rounded-full" :class="accountColorClasses(k.color).dot" :style="width(k.share)" />
            </span>
            <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ percent(k.share) }}</span>
          </span>
        </button>

        <template v-if="!collapsedAccounts.has(k.accountId)">
          <div v-for="a in k.tasks" :key="taskKey(k.accountId, a.taskId)">
            <div class="grid min-h-11 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 hover:bg-raised">
              <span class="flex min-w-0 items-center gap-2 pl-6">
                <button
                  type="button"
                  class="flex min-w-0 items-center gap-2 text-left"
                  :aria-expanded="openTasks.has(taskKey(k.accountId, a.taskId))"
                  @click="toggle(openTasks, taskKey(k.accountId, a.taskId))"
                >
                  <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': openTasks.has(taskKey(k.accountId, a.taskId)) }" />
                  <span v-if="a.taskId == null" class="truncate text-muted-foreground italic">ohne Aufgabe</span>
                  <template v-else>
                    <TaskKey v-if="a.key" :value="a.key" />
                    <span class="truncate" :title="a.title ?? undefined">{{ a.title }}</span>
                  </template>
                </button>
                <NuxtLink v-if="a.taskId != null" :to="`/tasks/${a.taskId}`" class="shrink-0 text-xs text-muted-foreground hover:text-primary">
                  öffnen
                </NuxtLink>
              </span>
              <span class="text-right font-mono tabular-nums">{{ formatDuration(a.minutes) }}</span>
              <span class="flex items-center gap-2">
                <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span class="block h-full rounded-full bg-muted-foreground" :style="width(a.share)" />
                </span>
                <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ percent(a.share) }}</span>
              </span>
            </div>

            <template v-if="openTasks.has(taskKey(k.accountId, a.taskId))">
              <div v-for="t in a.days" :key="t.date" class="grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 text-[13px] text-muted-foreground">
                <span class="min-w-0 truncate pl-18">
                  <NuxtLink :to="t.date === today() ? '/' : `/?date=${t.date}`" class="text-foreground hover:text-primary">
                    {{ format(toDate(t.date), 'EEE d.M.yyyy', { locale: de }) }}
                  </NuxtLink>
                  <span v-if="t.notes.length" class="ml-2 text-xs">{{ t.notes.join(' · ') }}</span>
                </span>
                <span class="text-right font-mono tabular-nums">{{ formatDuration(t.minutes) }}</span>
                <span class="text-right font-mono text-xs tabular-nums">{{ percent(t.share) }}</span>
              </div>
            </template>
          </div>
        </template>
      </div>
    </section>
  </template>
</template>
