<script setup lang="ts">
import { Archive, Circle, CircleCheck, CircleDot, GripVertical, Pencil, Plus } from '@lucide/vue'

useHead({ title: 'Konten & Aufgaben · daybreak' })

const route = useRoute()
const router = useRouter()
const { data: accounts } = useAccounts()

const showArchived = ref(false)

// Local copy of the saved order, so a drop shows the new order immediately
const orderedAccounts = ref<typeof accounts.value>([])
watch(accounts, (saved) => { orderedAccounts.value = [...saved] }, { immediate: true })
const activeAccounts = computed(() => orderedAccounts.value.filter(account => account.status === 'active'))
const archivedAccounts = computed(() => (showArchived.value ? orderedAccounts.value.filter(account => account.status === 'archived') : []))
const visibleAccounts = computed(() => [...activeAccounts.value, ...archivedAccounts.value])

// --- Drag and drop sorting: only the grip starts a drag, a placeholder slot shows the landing position ---
const draggedAccountId = ref<number | null>(null)
/** Landing position among the active rows (0 = before the first row, length = after the last row) */
const dropIndex = ref<number | null>(null)
const draggedRowHeight = ref(0)
let pendingDragFrame: number | null = null

function dragStart(event: DragEvent, accountId: number, index: number) {
  const row = (event.currentTarget as HTMLElement).parentElement
  if (!event.dataTransfer || !row) return
  const rowBox = row.getBoundingClientRect()
  event.dataTransfer.setDragImage(row, event.clientX - rowBox.left, event.clientY - rowBox.top)
  event.dataTransfer.setData('text/plain', '') // Firefox starts a drag only with data
  event.dataTransfer.effectAllowed = 'move'
  draggedRowHeight.value = rowBox.height
  // Collapse the row only after the browser has captured the drag image; it must stay mounted so `dragend` fires
  pendingDragFrame = requestAnimationFrame(() => {
    pendingDragFrame = null
    draggedAccountId.value = accountId
    dropIndex.value = index
  })
}

function dragOverRow(event: DragEvent, index: number) {
  if (draggedAccountId.value === null) return
  event.preventDefault()
  const rowBox = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropIndex.value = event.clientY < rowBox.top + rowBox.height / 2 ? index : index + 1
}

// The list container is the only drop target, so a release in a gap or the padding still lands at the slot
function dragOverList(event: DragEvent) {
  if (draggedAccountId.value === null) return
  event.preventDefault()
}

function dragEnd() {
  if (pendingDragFrame !== null) cancelAnimationFrame(pendingDragFrame)
  pendingDragFrame = null
  draggedAccountId.value = null
  dropIndex.value = null
}

async function drop(event: DragEvent) {
  event.preventDefault()
  if (draggedAccountId.value === null || dropIndex.value === null) return
  const activeIds = activeAccounts.value.map(account => account.id)
  const draggedIndex = activeIds.indexOf(draggedAccountId.value)
  const newIds = activeIds.filter(id => id !== draggedAccountId.value)
  newIds.splice(dropIndex.value - (draggedIndex < dropIndex.value ? 1 : 0), 0, draggedAccountId.value)
  if (newIds.join() === activeIds.join()) return
  orderedAccounts.value = [...newIds.map(id => accounts.value.find(account => account.id === id)!), ...orderedAccounts.value.filter(account => account.status === 'archived')]
  const saved = await runAction(() => api('/api/accounts/reorder', { method: 'POST', body: { ids: newIds } }), MASTER_DATA_KEYS)
  if (!saved) orderedAccounts.value = [...accounts.value]
}

const selectedId = computed(() => Number(route.query.accountId) || visibleAccounts.value[0]?.id)
const selected = computed(() => accounts.value.find(account => account.id === selectedId.value))

const { data: tasks } = useFetch('/api/tasks', {
  key: 'account-tasks',
  query: { accountId: selectedId },
  default: () => [],
  immediate: !!selectedId.value,
  watch: [selectedId],
})

const accountDialog = ref(false)
const accountEdit = ref<typeof accounts.value[number] | null>(null)
const taskDialog = ref(false)

function newAccount() {
  accountEdit.value = null
  accountDialog.value = true
}

function accountChange() {
  accountEdit.value = selected.value ?? null
  accountDialog.value = true
}

// Display status: "in progress" = open and time already booked
function statusDisplay(task: { status: string, bookedMin: number }) {
  if (task.status === 'closed') return { text: 'Abgeschlossen', icon: CircleCheck, cssClass: 'text-positive' }
  if (task.bookedMin > 0) return { text: 'In Arbeit', icon: CircleDot, cssClass: 'text-info' }
  return { text: 'Offen', icon: Circle, cssClass: 'text-muted-foreground' }
}

function select(id: number) {
  router.replace({ query: { accountId: id } })
}
</script>

<template>
  <div class="flex flex-wrap items-start gap-6">
    <Card class="max-w-[300px] flex-[1_1_260px] gap-0 py-0">
      <CardHeader class="flex min-h-11 flex-row items-center justify-between py-0 pr-2">
        <CardTitle>Konten</CardTitle>
        <Button size="sm" variant="outline" class="h-[30px] text-[13px]" @click="newAccount">
          <Plus /> Neu
        </Button>
      </CardHeader>
      <div class="grid gap-0.5 p-2" @dragover="dragOverList" @drop="drop">
        <template v-for="(account, index) in activeAccounts" :key="account.id">
          <div v-if="draggedAccountId !== null && dropIndex === index" class="rounded-md border border-dashed border-line-strong" :style="{ height: `${draggedRowHeight}px` }" />
          <div
            class="flex items-center rounded-md pl-1"
            :class="[account.id === selectedId ? 'bg-muted' : 'hover:bg-raised', { hidden: draggedAccountId === account.id }]"
            @dragover="dragOverRow($event, index)"
          >
            <span
              class="grid size-6 shrink-0 cursor-grab place-items-center text-line-strong hover:text-muted-foreground"
              role="img"
              draggable="true"
              title="Ziehen zum Sortieren"
              aria-label="Ziehen zum Sortieren"
              @dragstart="dragStart($event, account.id, index)"
              @dragend="dragEnd"
            >
              <GripVertical class="size-4" />
            </span>
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2.5 pr-3 pl-2 text-left"
              :aria-current="account.id === selectedId ? 'true' : undefined"
              @click="select(account.id)"
            >
              <span class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(account.color).dot" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ account.name }}</span>
                <span v-if="account.aliases.length" class="block truncate font-mono text-[11px] text-muted-foreground">{{ account.aliases.join(' · ') }}</span>
              </span>
            </button>
          </div>
        </template>
        <div v-if="draggedAccountId !== null && dropIndex === activeAccounts.length" class="rounded-md border border-dashed border-line-strong" :style="{ height: `${draggedRowHeight}px` }" />
        <div
          v-for="account in archivedAccounts"
          :key="account.id"
          class="flex items-center rounded-md pl-1 text-muted-foreground"
          :class="account.id === selectedId ? 'bg-muted' : 'hover:bg-raised'"
        >
          <span class="size-6 shrink-0" />
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2.5 pr-3 pl-2 text-left"
            :aria-current="account.id === selectedId ? 'true' : undefined"
            @click="select(account.id)"
          >
            <span class="size-2.5 shrink-0 rounded-full" :class="accountColorClasses(account.color).dot" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ account.name }}</span>
              <span v-if="account.aliases.length" class="block truncate font-mono text-[11px] text-muted-foreground">{{ account.aliases.join(' · ') }}</span>
            </span>
          </button>
        </div>
        <p v-if="!visibleAccounts.length" class="px-3 py-2.5 text-sm text-muted-foreground">
          Noch keine Konten.
        </p>
      </div>
      <div class="flex items-center gap-2 border-t px-4 py-3">
        <Switch id="archived" v-model="showArchived" />
        <Label for="archived" class="text-[13px] font-normal text-muted-foreground">Archivierte zeigen</Label>
      </div>
    </Card>

    <section v-if="selected" class="grid min-w-0 flex-[999_1_560px] gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <span class="size-3 shrink-0 rounded-full" :class="accountColorClasses(selected.color).dot" />
        <h1 class="min-w-0 truncate text-2xl font-semibold tracking-tight" :title="selected.name">
          {{ selected.name }}
        </h1>
        <span v-if="selected.aliases.length" class="font-mono text-[13px] text-muted-foreground">{{ selected.aliases.join(' · ') }}</span>
        <span v-if="selected.status === 'archived'" class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Archive class="size-3.5" /> archiviert
        </span>
        <div class="grow" />
        <Button variant="outline" @click="accountChange">
          <Pencil /> Bearbeiten
        </Button>
        <Button @click="taskDialog = true">
          <Plus /> Aufgabe
        </Button>
      </div>

      <Card class="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow class="bg-card hover:bg-card">
              <TableHead class="h-9 w-32 px-4 text-xs font-normal text-muted-foreground">
                Key
              </TableHead>
              <TableHead class="h-9 px-4 text-xs font-normal text-muted-foreground">
                Titel
              </TableHead>
              <TableHead class="h-9 w-36 px-4 text-xs font-normal text-muted-foreground">
                Status
              </TableHead>
              <TableHead class="h-9 w-28 px-4 text-right text-xs font-normal text-muted-foreground">
                Schätzung
              </TableHead>
              <TableHead class="h-9 w-28 px-4 text-right text-xs font-normal text-muted-foreground">
                Gebucht
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="task in tasks"
              :key="task.id"
              class="h-11 cursor-pointer hover:bg-raised"
              @click="navigateTo(`/tasks/${task.id}`)"
            >
              <TableCell class="px-4">
                <TaskKey v-if="task.key" :value="task.key" :color="selected.color" :class="{ 'opacity-60': task.status === 'closed' }" />
              </TableCell>
              <TableCell class="px-4 whitespace-normal wrap-anywhere" :class="{ 'text-muted-foreground': task.status === 'closed' }">
                {{ task.title }}
              </TableCell>
              <TableCell class="px-4">
                <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="statusDisplay(task).cssClass">
                  <component :is="statusDisplay(task).icon" class="size-3.5" />
                  {{ statusDisplay(task).text }}
                </span>
              </TableCell>
              <TableCell class="px-4 text-right text-muted-foreground tabular-nums">
                {{ task.estimateMin ? formatDuration(task.estimateMin) : '–' }}
              </TableCell>
              <TableCell class="px-4 text-right tabular-nums" :class="{ 'text-negative': task.estimateMin && task.bookedMin > task.estimateMin }">
                {{ formatDuration(task.bookedMin) }}
              </TableCell>
            </TableRow>
            <TableRow v-if="!tasks.length" class="hover:bg-transparent">
              <TableCell colspan="5" class="px-4 py-6 text-center whitespace-normal text-muted-foreground">
                Keine Aufgaben – Zeit kann auch direkt aufs Konto gebucht werden.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </section>
    <Card v-else class="min-w-0 flex-[999_1_560px]">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        Lege zuerst ein Konto an – dann klart es hier auf.
      </CardContent>
    </Card>

    <AccountDialog v-model:open="accountDialog" :account="accountEdit" @saved="select" />
    <TaskDialog v-model:open="taskDialog" :account-id="selectedId" />
  </div>
</template>
