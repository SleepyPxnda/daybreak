<script setup lang="ts">
import { GripVertical } from '@lucide/vue'

// Open tasks with bookings in the last 14 days or planned today - drag onto the timeline
const props = defineProps<{ date: string }>()

const { data: tasks } = useFetch('/api/tasks', {
  key: 'tasks-in-progress',
  query: { activeOn: toRef(props, 'date') },
  default: () => [],
})
const { data: accounts } = useAccounts()
const color = (accountId: number) => accounts.value.find(k => k.id === accountId)?.color

function dragStart(e: DragEvent, id: number) {
  e.dataTransfer?.setData(DRAG_TASK, String(id))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <Card class="gap-0 pb-0">
    <CardHeader>
      <CardTitle class="flex items-center justify-between gap-2">
        Aufgaben in Arbeit
        <span class="font-mono text-xs font-normal text-muted-foreground">{{ tasks.length }}</span>
      </CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-1 px-0">
      <p v-if="!tasks.length" class="px-4 py-2 text-sm text-muted-foreground">
        Keine – buche per Schnelleingabe oder lege Aufgaben unter Konten an.
      </p>
      <div
        v-for="a in tasks"
        :key="a.id"
        draggable="true"
        class="group relative flex min-h-10 cursor-grab items-center gap-2.5 border-b px-4 py-1.5 text-sm last:border-b-0 hover:bg-raised active:cursor-grabbing"
        @dragstart="dragStart($event, a.id)"
      >
        <!-- Handle sits in the card padding so it takes no space on the left -->
        <GripVertical class="absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100" />
        <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(color(a.accountId)).dot" />
        <NuxtLink :to="`/tasks/${a.id}`" class="fade-end min-w-0 flex-1 hover:underline" draggable="false" :title="a.title">
          <TaskKey v-if="a.key" :value="a.key" :color="color(a.accountId)" class="mr-1" />
          {{ a.title }}
        </NuxtLink>
        <span class="shrink-0 font-mono text-[13px] text-muted-foreground">{{ formatDuration(a.bookedMin) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
