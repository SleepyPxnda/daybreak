<script setup lang="ts">
import { BellRing } from '@lucide/vue'
import { isDue } from '#shared/utils/todos'
import TodoList from '~/components/todos/TodoList.vue'

// Today cards: open reminders, waiting-for items, daily topics.
// Shows all open waiting-for items, with due ones highlighted and on top.
const { byKind } = useOpenTodos()
const reminder = byKind('reminder')
const waitingFor = byKind('waiting_for')
const daily = byKind('daily_topic')
const countDue = computed(() => waitingFor.value.filter(t => isDue(t, today())).length)
</script>

<template>
  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Merker
        <span class="flex items-center gap-3 text-xs font-normal">
          <span class="font-mono text-muted-foreground">{{ reminder.length }}</span>
          <NuxtLink to="/todos" class="text-primary hover:underline">alle</NuxtLink>
        </span>
      </CardTitle>
    </CardHeader>
    <TodoList kind="reminder" :todos="reminder" compact empty-text="Keine – „t …“ in der Schnelleingabe." />
  </Card>

  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Warten auf
        <span v-if="countDue" class="flex items-center gap-1 text-xs font-medium text-warning">
          <BellRing class="size-3.5" /> {{ countDue }} nachfassen
        </span>
        <span v-else class="font-mono text-xs font-normal text-muted-foreground">{{ waitingFor.length }}</span>
      </CardTitle>
    </CardHeader>
    <TodoList kind="waiting_for" :todos="waitingFor" compact empty-text="Keine – „w Wer: …“ in der Schnelleingabe." />
  </Card>

  <Card class="gap-0 py-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Daily-Themen
        <span class="font-mono text-xs font-normal text-muted-foreground">{{ daily.length }}</span>
      </CardTitle>
    </CardHeader>
    <TodoList kind="daily_topic" :todos="daily" compact empty-text="Keine – „d …“ in der Schnelleingabe." />
  </Card>
</template>
