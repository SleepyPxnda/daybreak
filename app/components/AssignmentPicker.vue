<script setup lang="ts">
// Picker for a task or directly an account - value format see utils/assignment.ts
const value = defineModel<string>({ default: '' })
const { placeholder = 'Aufgabe oder Konto wählen' } = defineProps<{ placeholder?: string }>()

const { data: accounts } = useAccounts()
const { data: tasks } = useAllTasks()

// Closed/archived entries only when currently selected (not in suggestions)
const groups = computed(() => accounts.value
  .filter(k => k.status === 'active' || value.value === `k:${k.id}` || tasks.value.some(a => a.accountId === k.id && value.value === `a:${a.id}`))
  .map(k => ({
    account: k,
    tasks: tasks.value.filter(a => a.accountId === k.id && (a.status === 'open' || value.value === `a:${a.id}`)),
  })))

// Render the display in the trigger itself (Reka otherwise shows only raw text without spacing/color)
const selection = computed(() => {
  const { taskId, accountId } = assignmentFromValue(value.value)
  const task = taskId ? tasks.value.find(a => a.id === taskId) : undefined
  const account = accounts.value.find(k => k.id === (task?.accountId ?? accountId))
  return account ? { task, account } : undefined
})
</script>

<template>
  <Select v-model="value">
    <!-- contain-inline-size: long task titles must not widen the dialog, they fade out instead -->
    <SelectTrigger class="w-full min-w-0 rounded-md data-[size=default]:h-9" :title="selection?.task?.title">
      <SelectValue :placeholder="placeholder" class="min-w-0 flex-1 contain-inline-size !flex items-center gap-2">
        <template v-if="selection">
          <template v-if="selection.task">
            <TaskKey v-if="selection.task.key" :value="selection.task.key" :color="selection.account.color" />
            <span v-else class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(selection.account.color).dot" />
            <span class="fade-end min-w-0 flex-1 text-left">{{ selection.task.title }}</span>
          </template>
          <template v-else>
            <span class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(selection.account.color).dot" />
            <span class="fade-end min-w-0 flex-1 text-left">{{ selection.account.name }} <span class="text-muted-foreground">· direkt aufs Konto</span></span>
          </template>
        </template>
      </SelectValue>
    </SelectTrigger>
    <SelectContent class="max-w-[min(36rem,calc(100vw-2rem))]">
      <SelectGroup v-for="g in groups" :key="g.account.id">
        <SelectLabel class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" :class="accountColorClasses(g.account.color).dot" />
          {{ g.account.name }}
        </SelectLabel>
        <SelectItem :value="`k:${g.account.id}`">
          <span class="text-muted-foreground">direkt aufs Konto</span>
        </SelectItem>
        <SelectItem v-for="a in g.tasks" :key="a.id" :value="`a:${a.id}`" :title="a.title" class="*:[span]:last:min-w-0 *:[span]:last:gap-2">
          <TaskKey v-if="a.key" :value="a.key" :color="g.account.color" />
          <span class="min-w-0 truncate">{{ a.title }}</span>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
