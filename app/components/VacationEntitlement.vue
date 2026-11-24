<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, Trash2 } from '@lucide/vue'
import { vacationWindowText } from '#shared/utils/vacation'

// Settings -> vacation entitlement per year: edit entries, take over carryover from the previous year
const year = ref(Number(today().slice(0, 4)))
const { data: vacation } = useFetch('/api/vacation', { key: 'vacation', query: { year } })

const number = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const half = (t: number) => Math.round(t * 2) / 2

const KIND_LABELS: Record<string, string> = { base: 'Grund', extra: 'Zusatz', carryover: 'Rest' }

type EntitlementField = 'label' | 'days' | 'kind' | 'validFrom' | 'validUntil'

// Fields whose last save was rejected (`<entryId>:<field>`) show a red border until a save of that field succeeds
const rejectedFields = reactive(new Set<string>())
// Bumped per field to re-mount just that control, so it shows the stored value again
const resetCounters = reactive<Record<string, number>>({})
const fieldKey = (id: number, field: EntitlementField) => `${id}:${field}`
const controlKey = (id: number, field: EntitlementField) => `${fieldKey(id, field)}:${resetCounters[fieldKey(id, field)] ?? 0}`
const isRejected = (id: number, field: EntitlementField) => rejectedFields.has(fieldKey(id, field)) || undefined
const resetControl = (id: number, field: EntitlementField) => {
  resetCounters[fieldKey(id, field)] = (resetCounters[fieldKey(id, field)] ?? 0) + 1
}
watch(year, () => rejectedFields.clear())

async function change(id: number, field: EntitlementField, value: string | number | null) {
  const body = { [field]: field === 'days' ? half(Number(value)) : value }
  const saved = await runAction(() => api(`/api/vacation/entitlements/${id}`, { method: 'PATCH', body }), ['vacation'])
  if (saved === undefined) {
    rejectedFields.add(fieldKey(id, field))
    resetControl(id, field)
  }
  else {
    rejectedFields.delete(fieldKey(id, field))
  }
}

// Saves on blur only when the value differs; an incomplete date (badInput) saves nothing and shows the stored value again
function changeDate(id: number, field: 'validFrom' | 'validUntil', input: HTMLInputElement, storedValue: string | null) {
  if (input.value === '' && input.validity.badInput) return resetControl(id, field)
  const value = input.value || null
  if (value !== storedValue) change(id, field, value)
}

async function remove(id: number) {
  await runAction(() => api(`/api/vacation/entitlements/${id}`, { method: 'DELETE' }), ['vacation'])
}

const newEntitlement = reactive<{ label: string, days: number | null | undefined }>({ label: '', days: 1 })
async function add() {
  const days = newEntitlement.days
  if (!newEntitlement.label.trim() || days == null) return
  const kind = vacation.value?.entitlements.length ? 'extra' : 'base'
  const ok = await runAction(() => api('/api/vacation/entitlements', {
    method: 'POST',
    body: { year: year.value, kind, label: newEntitlement.label, days: half(days) },
  }), ['vacation'])
  if (ok) {
    newEntitlement.label = ''
    newEntitlement.days = 1
  }
}

async function carryOver() {
  await runAction(() => api('/api/vacation/carry-over', { method: 'POST', body: { year: year.value } }), ['vacation'])
}

const hasCarryoverEntitlement = computed(() => vacation.value?.entitlements.some(p => p.kind === 'carryover') ?? false)
</script>

<template>
  <Card id="vacation" class="gap-0 pb-0">
    <CardHeader class="flex flex-row items-center justify-between py-1">
      <CardTitle>Urlaubsanspruch</CardTitle>
      <div class="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Vorheriges Jahr" @click="year--">
          <ChevronLeft />
        </Button>
        <span class="w-12 text-center font-mono text-sm font-medium tabular-nums">{{ year }}</span>
        <Button size="icon-sm" variant="ghost" aria-label="Nächstes Jahr" @click="year++">
          <ChevronRight />
        </Button>
      </div>
    </CardHeader>
    <template v-if="vacation">
      <div class="grid min-h-9 grid-cols-[7rem_minmax(0,1fr)_8rem_9.5rem_9.5rem_2rem] items-center gap-2 border-b bg-card px-4 text-xs text-muted-foreground">
        <span>Art</span><span>Bezeichnung</span><span class="text-right">Tage</span><span>Gültig ab</span><span>Gültig bis</span><span />
      </div>
      <div v-for="p in vacation.entitlements" :key="p.id" class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_9.5rem_9.5rem_2rem] items-center gap-2 border-b px-4 py-1.5">
        <Select :key="controlKey(p.id, 'kind')" :model-value="p.kind" @update:model-value="change(p.id, 'kind', String($event))">
          <SelectTrigger class="w-full" :aria-invalid="isRejected(p.id, 'kind')">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">
              Grund
            </SelectItem>
            <SelectItem value="extra">
              Zusatz
            </SelectItem>
            <SelectItem value="carryover">
              Rest
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          :key="controlKey(p.id, 'label')"
          :model-value="p.label"
          aria-label="Bezeichnung"
          :aria-invalid="isRejected(p.id, 'label')"
          @change="change(p.id, 'label', ($event.target as HTMLInputElement).value)"
        />
        <NumberInput
          :key="controlKey(p.id, 'days')"
          :model-value="p.days"
          :step="0.5"
          aria-label="Tage"
          :aria-invalid="isRejected(p.id, 'days')"
          @update:model-value="$event != null && $event !== p.days && change(p.id, 'days', $event)"
        />
        <Input
          :key="controlKey(p.id, 'validFrom')"
          type="date"
          class="font-mono"
          aria-label="Gültig ab"
          :model-value="p.validFrom ?? ''"
          :aria-invalid="isRejected(p.id, 'validFrom')"
          @blur="changeDate(p.id, 'validFrom', $event.target as HTMLInputElement, p.validFrom)"
        />
        <Input
          :key="controlKey(p.id, 'validUntil')"
          type="date"
          class="font-mono"
          aria-label="Gültig bis"
          :model-value="p.validUntil ?? ''"
          :aria-invalid="isRejected(p.id, 'validUntil')"
          @blur="changeDate(p.id, 'validUntil', $event.target as HTMLInputElement, p.validUntil)"
        />
        <Button size="icon-sm" variant="ghost" aria-label="Posten löschen" @click="remove(p.id)">
          <Trash2 />
        </Button>
      </div>
      <div v-for="(handedOn, index) in vacation.handedOnEntitlements" :key="`${index}:${handedOn.fromYear}:${handedOn.label}:${handedOn.validFrom}`" class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_9.5rem_9.5rem_2rem] items-center gap-2 border-b px-4 py-1.5 text-sm">
        <span class="text-muted-foreground">{{ KIND_LABELS[handedOn.kind] }}</span>
        <span class="truncate">{{ handedOn.label }} (aus {{ handedOn.fromYear }})</span>
        <span class="pr-3 text-right font-mono tabular-nums">{{ number(handedOn.days) }}</span>
        <span class="col-span-2 text-[13px] text-muted-foreground">{{ vacationWindowText(handedOn.validFrom, handedOn.validUntil, year) }}</span>
        <span />
      </div>

      <form class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_auto] items-center gap-2 border-b px-4 py-1.5" @submit.prevent="add">
        <span class="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Plus class="size-4 shrink-0" /> Neu</span>
        <Input v-model="newEntitlement.label" :placeholder="vacation.entitlements.length ? 'z. B. Sonderurlaub SS 27' : 'Grundanspruch'" />
        <NumberInput v-model="newEntitlement.days" :step="0.5" aria-label="Tage" />
        <Button type="submit" size="sm" variant="outline" :disabled="!newEntitlement.label.trim() || newEntitlement.days == null">
          Hinzufügen
        </Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-2.5 text-sm">
        <span class="font-mono text-[13px] text-muted-foreground tabular-nums">
          Anspruch <span class="text-foreground">{{ number(vacation.entitlement) }}</span> · genommen <span class="text-foreground">{{ number(vacation.taken) }}</span> · geplant <span class="text-foreground">{{ number(vacation.planned) }}</span> ·
          <template v-if="vacation.forfeited > 0">verfallen <span class="text-foreground">{{ number(vacation.forfeited) }}</span> · </template>Rest <span class="font-medium" :class="vacation.carryover < 0 ? 'text-negative' : 'text-foreground'">{{ number(vacation.carryover) }}</span>
        </span>
        <Button v-if="vacation.previousYearCarryover !== null" size="sm" variant="outline" @click="carryOver">
          {{ hasCarryoverEntitlement ? 'Rest aktualisieren' : 'Rest aus Vorjahr übernehmen' }} ({{ number(vacation.previousYearCarryover) }})
        </Button>
      </div>
    </template>
  </Card>
</template>
