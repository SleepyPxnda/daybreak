<script setup lang="ts">
interface TaskData {
  id: number
  accountId: number
  key: string | null
  title: string
  estimateMin: number | null
}

const props = defineProps<{
  task?: TaskData | null
  /** Preselection when creating */
  accountId?: number | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: number] }>()

const { data: accounts } = useAccounts()
const activeAccounts = computed(() => accounts.value.filter(k => k.status === 'aktiv' || k.id === props.task?.accountId))

const selectedAccount = ref<string>('')
const key = ref('')
const title = ref('')
const estimateHours = ref<number | null | undefined>()

watch(open, (nowOpen) => {
  if (!nowOpen) return
  selectedAccount.value = String(props.task?.accountId ?? props.accountId ?? '')
  key.value = props.task?.key ?? ''
  title.value = props.task?.title ?? ''
  estimateHours.value = props.task?.estimateMin ? props.task.estimateMin / 60 : undefined
})

async function save() {
  const body = {
    accountId: Number(selectedAccount.value),
    key: key.value,
    title: title.value,
    estimateMin: estimateHours.value ? Math.round(estimateHours.value * 60) : null,
  }
  const result = await runAction(
    () => props.task
      ? api<{ id: number }>(`/api/tasks/${props.task.id}`, { method: 'PATCH', body })
      : api<{ id: number }>('/api/tasks', { method: 'POST', body }),
    [...MASTER_DATA_KEYS, 'account-tasks', 'task-detail'],
  )
  if (result) {
    open.value = false
    emit('saved', result.id)
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</DialogTitle>
        <DialogDescription>Eine Aufgabe gehört zu genau einem Konto.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Konto</Label>
          <Select v-model="selectedAccount" required>
            <SelectTrigger class="w-full rounded-md data-[size=default]:h-9">
              <SelectValue placeholder="Konto wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="k in activeAccounts" :key="k.id" :value="String(k.id)">
                <span class="size-2.5 rounded-full" :class="accountColorClasses(k.color).dot" />
                {{ k.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-[8rem_1fr] gap-3">
          <div class="grid gap-1.5">
            <Label for="task-key" class="text-xs font-normal text-muted-foreground">Key</Label>
            <Input id="task-key" v-model="key" class="h-9 rounded-md" placeholder="PROJ-123" />
          </div>
          <div class="grid gap-1.5">
            <Label for="task-title" class="text-xs font-normal text-muted-foreground">Titel</Label>
            <Input id="task-title" v-model="title" class="h-9 rounded-md" required autofocus />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="task-estimate" class="text-xs font-normal text-muted-foreground">Schätzung (Stunden, optional)</Label>
          <NumberInput id="task-estimate" v-model="estimateHours" :min="0" :step="0.25" placeholder="–" class="w-36" />
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="!selectedAccount">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
