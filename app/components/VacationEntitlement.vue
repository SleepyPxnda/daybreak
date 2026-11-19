<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, Trash2 } from '@lucide/vue'

// Settings -> vacation entitlement per year: edit entries, take over carryover from the previous year
const year = ref(Number(today().slice(0, 4)))
const { data: vacation } = useFetch('/api/vacation', { key: 'vacation', query: { year } })

const number = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const half = (t: number) => Math.round(t * 2) / 2

async function change(id: number, field: 'bezeichnung' | 'tage' | 'art', value: string | number) {
  const body = { [field]: field === 'tage' ? half(Number(value)) : value }
  await runAction(() => api(`/api/vacation/entitlements/${id}`, { method: 'PATCH', body }), ['vacation'])
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
      <div class="grid min-h-9 grid-cols-[7rem_minmax(0,1fr)_8rem_2rem] items-center gap-2 border-b bg-card px-4 text-xs text-muted-foreground">
        <span>Art</span><span>Bezeichnung</span><span class="text-right">Tage</span><span />
      </div>
      <div v-for="p in vacation.entitlements" :key="p.id" class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_2rem] items-center gap-2 border-b px-4 py-1.5">
        <Select :model-value="p.kind" @update:model-value="change(p.id, 'art', String($event))">
          <SelectTrigger class="w-full">
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
        <Input :model-value="p.label" aria-label="Bezeichnung" @change="change(p.id, 'bezeichnung', ($event.target as HTMLInputElement).value)" />
        <NumberInput
          :model-value="p.days"
          :step="0.5"
          aria-label="Tage"
          @update:model-value="$event != null && $event !== p.days && change(p.id, 'tage', $event)"
        />
        <Button size="icon-sm" variant="ghost" aria-label="Posten löschen" @click="remove(p.id)">
          <Trash2 />
        </Button>
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
          Rest <span class="font-medium" :class="vacation.carryover < 0 ? 'text-negative' : 'text-foreground'">{{ number(vacation.carryover) }}</span>
        </span>
        <Button v-if="vacation.previousYearCarryover !== null" size="sm" variant="outline" @click="carryOver">
          {{ hasCarryoverEntitlement ? 'Rest aktualisieren' : 'Rest aus Vorjahr übernehmen' }} ({{ number(vacation.previousYearCarryover) }})
        </Button>
      </div>
    </template>
  </Card>
</template>
