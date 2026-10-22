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

const neu = reactive<{ bezeichnung: string, tage: number | null | undefined }>({ bezeichnung: '', tage: 1 })
async function hinzufuegen() {
  const tage = neu.tage
  if (!neu.bezeichnung.trim() || tage == null) return
  const art = urlaub.value?.posten.length ? 'zusatz' : 'grund'
  const ok = await aktion(() => api('/api/urlaub/posten', {
    method: 'POST',
    body: { jahr: jahr.value, art, bezeichnung: neu.bezeichnung, tage: halb(tage) },
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
  <Card id="urlaub" class="gap-0 pb-0">
    <CardHeader class="flex flex-row items-center justify-between py-1">
      <CardTitle>Urlaubsanspruch</CardTitle>
      <div class="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Vorheriges Jahr" @click="jahr--">
          <ChevronLeft />
        </Button>
        <span class="w-12 text-center font-mono text-sm font-medium tabular-nums">{{ jahr }}</span>
        <Button size="icon-sm" variant="ghost" aria-label="Nächstes Jahr" @click="jahr++">
          <ChevronRight />
        </Button>
      </div>
    </CardHeader>
    <template v-if="urlaub">
      <div class="grid min-h-9 grid-cols-[7rem_minmax(0,1fr)_8rem_2rem] items-center gap-2 border-b bg-card px-4 text-xs text-muted-foreground">
        <span>Art</span><span>Bezeichnung</span><span class="text-right">Tage</span><span />
      </div>
      <div v-for="p in urlaub.posten" :key="p.id" class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_2rem] items-center gap-2 border-b px-4 py-1.5">
        <Select :model-value="p.art" @update:model-value="aendern(p.id, 'art', String($event))">
          <SelectTrigger class="w-full">
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
        <Input :model-value="p.bezeichnung" aria-label="Bezeichnung" @change="aendern(p.id, 'bezeichnung', ($event.target as HTMLInputElement).value)" />
        <ZahlInput
          :model-value="p.tage"
          :step="0.5"
          aria-label="Tage"
          @update:model-value="$event != null && $event !== p.tage && aendern(p.id, 'tage', $event)"
        />
        <Button size="icon-sm" variant="ghost" aria-label="Posten löschen" @click="loeschen(p.id)">
          <Trash2 />
        </Button>
      </div>

      <form class="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)_8rem_auto] items-center gap-2 border-b px-4 py-1.5" @submit.prevent="hinzufuegen">
        <span class="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Plus class="size-4 shrink-0" /> Neu</span>
        <Input v-model="neu.bezeichnung" :placeholder="urlaub.posten.length ? 'z. B. Sonderurlaub SS 27' : 'Grundanspruch'" />
        <ZahlInput v-model="neu.tage" :step="0.5" aria-label="Tage" />
        <Button type="submit" size="sm" variant="outline" :disabled="!neu.bezeichnung.trim() || neu.tage == null">
          Hinzufügen
        </Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-2.5 text-sm">
        <span class="font-mono text-[13px] text-muted-foreground tabular-nums">
          Anspruch <span class="text-foreground">{{ zahl(urlaub.anspruch) }}</span> · genommen <span class="text-foreground">{{ zahl(urlaub.genommen) }}</span> · geplant <span class="text-foreground">{{ zahl(urlaub.geplant) }}</span> ·
          Rest <span class="font-medium" :class="urlaub.rest < 0 ? 'text-negativ' : 'text-foreground'">{{ zahl(urlaub.rest) }}</span>
        </span>
        <Button v-if="urlaub.vorjahrRest !== null" size="sm" variant="outline" @click="restUebernehmen">
          {{ hatRestPosten ? 'Rest aktualisieren' : 'Rest aus Vorjahr übernehmen' }} ({{ zahl(urlaub.vorjahrRest) }})
        </Button>
      </div>
    </template>
  </Card>
</template>
