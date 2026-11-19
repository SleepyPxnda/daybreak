<script setup lang="ts">
export interface TemplateForm {
  id?: number
  name: string | null
  taskId: number | null
  accountId: number | null
  start: number
  end: number
  weekdays: number[]
  intervalWeeks: number
  validFrom: string
  validUntil: string | null
  /** "Save as recurring": link the source block */
  fromBlockId?: number
}

const props = defineProps<{ template?: TemplateForm | null }>()
const open = defineModel<boolean>('open', { default: false })

const name = ref('')
const assignment = ref('')
const start = ref(570)
const end = ref(585)
const weekdays = ref<number[]>([1, 2, 3, 4, 5])
const interval = ref('1')
const validFrom = ref(today())
const validUntil = ref('')

watch(open, (nowOpen) => {
  if (!nowOpen) return
  const v = props.template
  name.value = v?.name ?? ''
  assignment.value = v ? assignmentValue(v) : ''
  start.value = v?.start ?? 570
  end.value = v?.end ?? 585
  weekdays.value = [...(v?.weekdays ?? [1, 2, 3, 4, 5])]
  interval.value = String(v?.intervalWeeks ?? 1)
  validFrom.value = v?.validFrom ?? today()
  validUntil.value = v?.validUntil ?? ''
})

async function save() {
  const body = {
    name: name.value,
    ...assignmentFromValue(assignment.value),
    start: start.value,
    end: end.value,
    weekdays: weekdays.value,
    intervalWeeks: Number(interval.value),
    validFrom: validFrom.value,
    validUntil: validUntil.value || null,
  }
  const id = props.template?.id
  const ok = await runAction(
    () => id
      ? api(`/api/templates/${id}`, { method: 'PATCH', body })
      : api('/api/templates', { method: 'POST', body: { ...body, fromBlockId: props.template?.fromBlockId } }),
    ['templates', 'day-blocks'],
  )
  if (ok) open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ template?.id ? 'Wiederkehrenden Block bearbeiten' : 'Wiederkehrender Block' }}</DialogTitle>
        <DialogDescription>
          Wird automatisch als geplanter Block eingetragen (bis 14 Tage voraus). Änderungen wirken nur auf zukünftige, noch geplante Termine.
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-2">
          <Label for="template-name">Name (optional)</Label>
          <Input id="template-name" v-model="name" placeholder="z. B. Daily, Jour fixe" />
        </div>
        <div class="grid gap-2">
          <Label>Ziel</Label>
          <AssignmentPicker v-model="assignment" />
        </div>
        <div class="flex items-end gap-3">
          <div class="grid gap-2">
            <Label>Von</Label>
            <TimeInput v-model="start" />
          </div>
          <div class="grid gap-2">
            <Label>Bis</Label>
            <TimeInput v-model="end" />
          </div>
          <div class="grid gap-2">
            <Label>Rhythmus</Label>
            <Select v-model="interval">
              <SelectTrigger class="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  jede Woche
                </SelectItem>
                <SelectItem value="2">
                  jede 2. Woche
                </SelectItem>
                <SelectItem value="3">
                  jede 3. Woche
                </SelectItem>
                <SelectItem value="4">
                  jede 4. Woche
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="grid gap-2">
          <Label>Wochentage</Label>
          <WeekdayPicker v-model="weekdays" />
        </div>
        <div class="flex gap-3">
          <div class="grid gap-2">
            <Label for="template-from">Gültig ab</Label>
            <Input id="template-from" v-model="validFrom" type="date" class="font-mono" required />
          </div>
          <div class="grid gap-2">
            <Label for="template-until">Gültig bis (optional)</Label>
            <Input id="template-until" v-model="validUntil" type="date" class="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="!assignment || !weekdays.length || start >= end">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
