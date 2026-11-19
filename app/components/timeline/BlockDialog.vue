<script setup lang="ts">
import type { BlockKind, BlockStatus } from '#shared/utils/blocks'
import type { TimelineBlock } from '~/utils/timeline'

export interface BlockDraft {
  date: string
  start: number
  end: number
  status: BlockStatus
  kind?: BlockKind
  taskId?: number | null
  accountId?: number | null
  note?: string | null
}

const props = defineProps<{
  /** Existing block (edit) ... */
  block?: TimelineBlock | null
  /** ... or draft (create) */
  draft?: BlockDraft | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const isBreak = ref(false)
const assignment = ref('')
const start = ref(0)
const end = ref(0)
const booked = ref(true)
const note = ref('')

watch(open, (nowOpen) => {
  if (!nowOpen) return
  const source = props.block ?? props.draft
  if (!source) return
  isBreak.value = source.kind === 'break'
  assignment.value = assignmentValue(source)
  start.value = source.start
  end.value = source.end
  booked.value = source.status === 'booked'
  note.value = source.note ?? ''
})

const valid = computed(() => start.value < end.value && (isBreak.value || !!assignment.value))

async function save() {
  const body = {
    kind: isBreak.value ? 'break' : 'work',
    status: booked.value ? 'booked' : 'planned',
    start: start.value,
    end: end.value,
    ...(isBreak.value ? { taskId: null, accountId: null } : assignmentFromValue(assignment.value)),
    note: note.value || null,
  }
  const ok = await runAction(
    () => props.block
      ? api(`/api/blocks/${props.block.id}`, { method: 'PATCH', body })
      : api('/api/blocks', { method: 'POST', body: { ...body, date: props.draft!.date } }),
    DAY_KEYS,
  )
  if (ok) {
    open.value = false
    emit('saved')
  }
}

async function remove() {
  if (!props.block) return
  const ok = await runAction(() => api(`/api/blocks/${props.block!.id}`, { method: 'DELETE' }), DAY_KEYS)
  if (ok) open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ block ? 'Block bearbeiten' : 'Neuer Block' }}</DialogTitle>
        <DialogDescription v-if="block?.templateId">
          Termin aus einem wiederkehrenden Block.
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <Switch id="block-break" v-model="isBreak" />
            <Label for="block-break">Pause</Label>
          </div>
          <div class="flex items-center gap-2">
            <Switch id="block-booked" v-model="booked" />
            <Label for="block-booked">{{ booked ? 'Gebucht' : 'Geplant' }}</Label>
          </div>
        </div>
        <div v-if="!isBreak" class="grid gap-2">
          <Label>Aufgabe / Konto</Label>
          <AssignmentPicker v-model="assignment" />
        </div>
        <div class="flex gap-3">
          <div class="grid gap-2">
            <Label>Von</Label>
            <TimeInput v-model="start" />
          </div>
          <div class="grid gap-2">
            <Label>Bis</Label>
            <TimeInput v-model="end" />
          </div>
          <div class="grid gap-2">
            <Label>Dauer</Label>
            <div class="flex h-9 items-center font-mono text-sm text-muted-foreground">
              {{ start < end ? formatDuration(end - start) : '–' }}
            </div>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="block-note">Notiz</Label>
          <Textarea id="block-note" v-model="note" rows="2" />
        </div>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button v-if="block" type="button" variant="ghost" class="hover:text-destructive" @click="remove">
            Löschen
          </Button>
          <Button type="submit" :disabled="!valid">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
