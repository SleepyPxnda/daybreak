<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, Trash2 } from '@lucide/vue'

// Einstellungen → Urlaubsanspruch pro Jahr (Plan §3.5): Posten bearbeiten, Rest aus Vorjahr übernehmen
const jahr = ref(Number(heute().slice(0, 4)))
const { data: urlaub } = useFetch('/api/urlaub', { key: 'urlaub', query: { jahr } })

const zahl = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const halb = (t: number) => Math.round(t * 2) / 2

async function aendern(id: number, feld: 'bezeichnung' | 'tage' | 'art', wert: string | number) {
  const body = { [feld]: feld === 'tage' ? halb(Number(wert)) : wert }
  await aktion(() => api(`/api/urlaub/posten/${id}`, { method: 'PATCH', body }), ['urlaub'])
}

async function loeschen(id: number) {
  await aktion(() => api(`/api/urlaub/posten/${id}`, { method: 'DELETE' }), ['urlaub'])
}

const neu = reactive({ bezeichnung: '', tage: 1 })
async function hinzufuegen() {
  if (!neu.bezeichnung.trim()) return
  const art = urlaub.value?.posten.length ? 'zusatz' : 'grund'
  const ok = await aktion(() => api('/api/urlaub/posten', {
    method: 'POST',
    body: { jahr: jahr.value, art, bezeichnung: neu.bezeichnung, tage: halb(neu.tage) },
  }), ['urlaub'])
  if (ok) {
    neu.bezeichnung = ''
    neu.tage = 1
  }
}

async function restUebernehmen() {
  await aktion(() => api('/api/urlaub/rest-uebernehmen', { method: 'POST', body: { jahr: jahr.value } }), ['urlaub'])
}

const hatRestPosten = computed(() => urlaub.value?.posten.some(p => p.art === 'rest') ?? false)
</script>

<template>
  <Card id="urlaub">
    <CardHeader class="flex flex-row items-center justify-between">
      <CardTitle>Urlaubsanspruch</CardTitle>
      <div class="flex items-center gap-1">
        <Button size="icon" variant="ghost" class="size-8" aria-label="Vorheriges Jahr" @click="jahr--">
          <ChevronLeft />
        </Button>
        <span class="w-12 text-center font-medium tabular-nums">{{ jahr }}</span>
        <Button size="icon" variant="ghost" class="size-8" aria-label="Nächstes Jahr" @click="jahr++">
          <ChevronRight />
        </Button>
      </div>
    </CardHeader>
    <CardContent v-if="urlaub" class="grid gap-3">
      <div v-for="p in urlaub.posten" :key="p.id" class="flex items-center gap-2">
        <Select :model-value="p.art" @update:model-value="aendern(p.id, 'art', String($event))">
          <SelectTrigger class="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grund">
              Grund
            </SelectItem>
            <SelectItem value="zusatz">
              Zusatz
            </SelectItem>
            <SelectItem value="rest">
              Rest
            </SelectItem>
          </SelectContent>
        </Select>
        <Input :model-value="p.bezeichnung" class="flex-1" aria-label="Bezeichnung" @change="aendern(p.id, 'bezeichnung', ($event.target as HTMLInputElement).value)" />
        <Input
          :model-value="p.tage"
          type="number"
          step="0.5"
          class="w-24 text-right tabular-nums"
          aria-label="Tage"
          @change="aendern(p.id, 'tage', ($event.target as HTMLInputElement).value)"
        />
        <Button size="icon" variant="ghost" aria-label="Posten löschen" @click="loeschen(p.id)">
          <Trash2 />
        </Button>
      </div>

      <form class="flex items-center gap-2" @submit.prevent="hinzufuegen">
        <Plus class="mx-2 size-4 shrink-0 text-muted-foreground" />
        <Input v-model="neu.bezeichnung" :placeholder="urlaub.posten.length ? 'z. B. Sonderurlaub SS 27' : 'Grundanspruch'" class="flex-1" />
        <Input v-model.number="neu.tage" type="number" step="0.5" class="w-24 text-right tabular-nums" aria-label="Tage" />
        <Button type="submit" variant="secondary" :disabled="!neu.bezeichnung.trim()">
          Hinzufügen
        </Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
        <span class="tabular-nums">
          Anspruch <strong>{{ zahl(urlaub.anspruch) }}</strong> · genommen {{ zahl(urlaub.genommen) }} · geplant {{ zahl(urlaub.geplant) }} ·
          Rest <strong :class="urlaub.rest < 0 ? 'text-negativ' : ''">{{ zahl(urlaub.rest) }}</strong>
        </span>
        <Button v-if="urlaub.vorjahrRest !== null" size="sm" variant="secondary" @click="restUebernehmen">
          {{ hatRestPosten ? 'Rest aktualisieren' : 'Rest aus Vorjahr übernehmen' }} ({{ zahl(urlaub.vorjahrRest) }})
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
