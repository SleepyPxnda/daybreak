<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { DayType } from '#shared/utils/target'

const props = defineProps<{
  date: string
  type: DayType
  target: number
  holiday?: string
  isWorkday: boolean
  note: string | null
}>()

const TYPES: { value: DayType, label: string }[] = [
  { value: 'work', label: 'Arbeitstag' },
  { value: 'vacation', label: 'Urlaub' },
  { value: 'half_vacation', label: '½ Urlaub' },
  { value: 'sick', label: 'Krank' },
  { value: 'flex_day', label: 'Gleittag' },
]

const label = computed(() => {
  if (props.holiday) return props.holiday
  if (!props.isWorkday && props.type === 'work') return 'Frei'
  return TYPES.find(t => t.value === props.type)?.label ?? props.type
})

const open = ref(false)
const selectedType = ref<DayType>('work')
const overrideHours = ref<number | null | undefined>()
const dayNote = ref('')

watch(open, (nowOpen) => {
  if (!nowOpen) return
  selectedType.value = props.type
  overrideHours.value = undefined
  dayNote.value = props.note ?? ''
})

async function save() {
  const ok = await runAction(() => api(`/api/days/${props.date}`, {
    method: 'PUT',
    body: {
      type: selectedType.value,
      targetOverride: overrideHours.value == null ? null : snapToGrid(overrideHours.value * 60),
      note: dayNote.value || null,
    },
  }), DAY_KEYS)
  if (ok) open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline">
        {{ label }} · Soll <span class="font-mono">{{ formatDuration(target) }}</span>
        <ChevronDown />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-72">
      <form class="grid gap-3" @submit.prevent="save">
        <div class="grid gap-2">
          <Label>Tagestyp</Label>
          <Select v-model="selectedType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="holiday || !isWorkday" class="text-xs text-muted-foreground">
            Kein regulärer Arbeitstag – Abwesenheiten zählen hier nicht.
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="target-override">Soll abweichend (Stunden, optional)</Label>
          <NumberInput id="target-override" v-model="overrideHours" :min="0" :max="24" :step="0.25" placeholder="z. B. 4" class="w-36" />
        </div>
        <div class="grid gap-2">
          <Label for="day-note">Notiz</Label>
          <Input id="day-note" v-model="dayNote" />
        </div>
        <Button type="submit">
          Übernehmen
        </Button>
      </form>
    </PopoverContent>
  </Popover>
</template>
