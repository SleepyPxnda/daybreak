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
const allTasksOpen = computed(() => !!overview.value?.accounts.every(account => account.tasks.every(task => openTasks.value.has(taskKey(account.accountId, task.taskId)))))
function allToggle() {
  const accounts = overview.value?.accounts ?? []
  collapsedAccounts.value = new Set()
  openTasks.value = allTasksOpen.value
    ? new Set()
    : new Set(accounts.flatMap(account => account.tasks.map(task => taskKey(account.accountId, task.taskId))))
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
        <div class="font-mono text-2xl font-medium tabular-nums" :class="overview.total - overview.target >= 0 ? 'text-positive' : 'text-negative'">
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

      <div v-for="account in overview.accounts" :key="account.accountId">
        <button
          type="button"
          class="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b px-4 text-left hover:bg-raised"
          :aria-expanded="!collapsedAccounts.has(account.accountId)"
          @click="toggle(collapsedAccounts, account.accountId)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': !collapsedAccounts.has(account.accountId) }" />
            <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(account.color).dot" />
            <span class="truncate font-semibold">{{ account.name }}</span>
          </span>
          <span class="text-right font-mono tabular-nums">{{ formatDuration(account.minutes) }}</span>
          <span class="flex items-center gap-2">
            <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span class="block h-full rounded-full" :class="accountColorClasses(account.color).dot" :style="width(account.share)" />
            </span>
            <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ percent(account.share) }}</span>
          </span>
        </button>

        <template v-if="!collapsedAccounts.has(account.accountId)">
          <div v-for="task in account.tasks" :key="taskKey(account.accountId, task.taskId)">
            <div class="grid min-h-11 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 hover:bg-raised">
              <span class="flex min-w-0 items-center gap-2 pl-6">
                <button
                  type="button"
                  class="flex min-w-0 items-center gap-2 text-left"
                  :aria-expanded="openTasks.has(taskKey(account.accountId, task.taskId))"
                  @click="toggle(openTasks, taskKey(account.accountId, task.taskId))"
                >
                  <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-90': openTasks.has(taskKey(account.accountId, task.taskId)) }" />
                  <span v-if="task.taskId == null" class="truncate text-muted-foreground italic">ohne Aufgabe</span>
                  <template v-else>
                    <TaskKey v-if="task.key" :value="task.key" />
                    <span class="truncate" :title="task.title ?? undefined">{{ task.title }}</span>
                  </template>
                </button>
                <NuxtLink v-if="task.taskId != null" :to="`/tasks/${task.taskId}`" class="shrink-0 text-xs text-muted-foreground hover:text-primary">
                  öffnen
                </NuxtLink>
              </span>
              <span class="text-right font-mono tabular-nums">{{ formatDuration(task.minutes) }}</span>
              <span class="flex items-center gap-2">
                <span class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span class="block h-full rounded-full bg-muted-foreground" :style="width(task.share)" />
                </span>
                <span class="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">{{ percent(task.share) }}</span>
              </span>
            </div>

            <template v-if="openTasks.has(taskKey(account.accountId, task.taskId))">
              <div v-for="t in task.days" :key="t.date" class="grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_10rem] items-center gap-4 border-b bg-card/40 px-4 text-[13px] text-muted-foreground">
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
