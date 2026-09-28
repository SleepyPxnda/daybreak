<script setup lang="ts">
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Einstellungen } from '#shared/utils/einstellungen'
import { BUNDESLAENDER } from '#shared/utils/einstellungen'
import type { VorlageFormular } from '~/components/VorlageDialog.vue'

useHead({ title: 'Einstellungen · Daybreak' })

const { data: einstellungen } = await useEinstellungen()
const { data: vorlagen } = await useFetch('/api/vorlagen', { key: 'vorlagen', default: () => [] })

// Formularzustand (Stunden statt Minuten, wo es lesbarer ist)
const form = reactive({
  sollProTagStunden: 8,
  arbeitstage: [1, 2, 3, 4, 5] as number[],
  bundesland: 'BW' as Einstellungen['bundesland'],
  arbeitsbeginn: 480,
  timelineVon: 420,
  timelineBis: 1140,
  startDatum: heute(),
  startSaldoStunden: 0,
})

watchEffect(() => {
  const e = einstellungen.value
  if (!e) return
  form.sollProTagStunden = e.sollProTagMin / 60
  form.arbeitstage = [...e.arbeitstage]
  form.bundesland = e.bundesland
  form.arbeitsbeginn = e.arbeitsbeginn
  form.timelineVon = e.timelineVon
  form.timelineBis = e.timelineBis
  form.startDatum = e.stundenkontoStart.datum
  form.startSaldoStunden = e.stundenkontoStart.saldoMin / 60
})

async function speichern() {
  const ok = await aktion(() => api('/api/settings', {
    method: 'PUT',
    body: {
      sollProTagMin: aufRaster(form.sollProTagStunden * 60),
      arbeitstage: form.arbeitstage,
      bundesland: form.bundesland,
      arbeitsbeginn: form.arbeitsbeginn,
      timelineVon: form.timelineVon,
      timelineBis: form.timelineBis,
      stundenkontoStart: { datum: form.startDatum, saldoMin: Math.round(form.startSaldoStunden * 60) },
    },
  }), ['einstellungen', 'saldo'])
  if (ok) toast.success('Einstellungen gespeichert')
}

const vorlageDialog = ref(false)
const vorlageBearbeiten = ref<VorlageFormular | null>(null)

function vorlageNeu() {
  vorlageBearbeiten.value = null
  vorlageDialog.value = true
}

function vorlageAendern(v: VorlageFormular) {
  vorlageBearbeiten.value = v
  vorlageDialog.value = true
}

async function vorlageLoeschen(id: number) {
  await aktion(() => api(`/api/vorlagen/${id}`, { method: 'DELETE' }), ['vorlagen'])
}

async function vorlageAktiv(id: number, aktiv: boolean) {
  await aktion(() => api(`/api/vorlagen/${id}`, { method: 'PATCH', body: { aktiv } }), ['vorlagen'])
}
</script>

<template>
  <div class="grid max-w-3xl gap-6">
    <h1 class="text-2xl font-semibold">
      Einstellungen
    </h1>

    <Card>
      <CardHeader>
        <CardTitle>Arbeitszeit & Stundenkonto</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="grid gap-5" @submit.prevent="speichern">
          <div class="flex flex-wrap gap-6">
            <div class="grid gap-2">
              <Label for="soll">Soll pro Tag (Stunden)</Label>
              <Input id="soll" v-model.number="form.sollProTagStunden" type="number" min="0" max="24" step="0.25" class="w-28" />
            </div>
            <div class="grid gap-2">
              <Label>Bundesland (Feiertage)</Label>
              <Select v-model="form.bundesland">
                <SelectTrigger class="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="b in BUNDESLAENDER" :key="b" :value="b">
                    {{ b }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-2">
            <Label>Arbeitstage</Label>
            <WochentagAuswahl v-model="form.arbeitstage" />
          </div>
          <div class="flex flex-wrap gap-6">
            <div class="grid gap-2">
              <Label>Arbeitsbeginn</Label>
              <UhrzeitInput v-model="form.arbeitsbeginn" />
            </div>
            <div class="grid gap-2">
              <Label>Timeline von</Label>
              <UhrzeitInput v-model="form.timelineVon" />
            </div>
            <div class="grid gap-2">
              <Label>Timeline bis</Label>
              <UhrzeitInput v-model="form.timelineBis" />
            </div>
          </div>
          <div class="flex flex-wrap gap-6">
            <div class="grid gap-2">
              <Label for="start-datum">Stundenkonto ab</Label>
              <Input id="start-datum" v-model="form.startDatum" type="date" required class="w-40" />
            </div>
            <div class="grid gap-2">
              <Label for="start-saldo">Startsaldo (Stunden, ±)</Label>
              <Input id="start-saldo" v-model.number="form.startSaldoStunden" type="number" step="0.25" class="w-28" />
            </div>
          </div>
          <div>
            <Button type="submit">
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle>Wiederkehrende Blöcke</CardTitle>
        <Button size="sm" variant="secondary" @click="vorlageNeu">
          <Plus /> Neu
        </Button>
      </CardHeader>
      <CardContent class="grid gap-2">
        <p v-if="!vorlagen.length" class="text-sm text-muted-foreground">
          Noch keine – z. B. „Daily Mo–Fr 09:30–09:45“.
        </p>
        <div v-for="v in vorlagen" :key="v.id" class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm" :class="{ 'opacity-60': !v.aktiv }">
          <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(v.kontoFarbe).punkt" />
          <div class="flex-1">
            <div>{{ v.aufgabeTitel ?? v.kontoName }}</div>
            <div class="text-muted-foreground tabular-nums">
              {{ wochentageText(v.wochentage) }} · {{ formatUhrzeit(v.start) }}–{{ formatUhrzeit(v.ende) }}
              <template v-if="v.intervallWochen > 1">
                · jede {{ v.intervallWochen }}. Woche
              </template>
              <template v-if="v.gueltigBis">
                · bis {{ v.gueltigBis }}
              </template>
            </div>
          </div>
          <Switch :model-value="v.aktiv" aria-label="Aktiv" @update:model-value="vorlageAktiv(v.id, $event)" />
          <Button size="icon" variant="ghost" aria-label="Bearbeiten" @click="vorlageAendern(v)">
            <Pencil />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Löschen" @click="vorlageLoeschen(v.id)">
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>

    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageBearbeiten" />
  </div>
</template>
