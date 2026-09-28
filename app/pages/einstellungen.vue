<script setup lang="ts">
import { Archive, ArchiveRestore, ChevronRight, Pencil, Plus, Trash2 } from '@lucide/vue'
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
  urlaubErinnerungTage: 7,
  urlaubErinnerungText: '',
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
  form.urlaubErinnerungTage = e.urlaubErinnerungTage
  form.urlaubErinnerungText = e.urlaubErinnerungText
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
      urlaubErinnerungTage: Math.max(0, Math.round(form.urlaubErinnerungTage || 0)),
      urlaubErinnerungText: form.urlaubErinnerungText,
    },
  }), ['einstellungen', 'saldo', 'naechster-urlaub'])
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

/** Archivieren = keine neuen Termine mehr; künftige geplante verschwinden, vergangene/gebuchte bleiben */
async function vorlageArchivieren(id: number, archivieren: boolean) {
  const ok = await aktion(() => api(`/api/vorlagen/${id}`, { method: 'PATCH', body: { aktiv: !archivieren } }), ['vorlagen', 'tag-bloecke'])
  if (ok) toast.success(archivieren ? 'Archiviert' : 'Wiederhergestellt')
}

const aktiveVorlagen = computed(() => vorlagen.value.filter(v => v.aktiv))
const archivierteVorlagen = computed(() => vorlagen.value.filter(v => !v.aktiv))
const archivOffen = ref(false)
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
              <ZahlInput id="soll" v-model="form.sollProTagStunden" :min="0" :max="24" :step="0.25" class="w-32" />
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
              <ZahlInput id="start-saldo" v-model="form.startSaldoStunden" :step="0.25" class="w-32" />
            </div>
          </div>
          <div class="flex flex-wrap gap-6">
            <div class="grid gap-2">
              <Label for="urlaub-vorlauf">Urlaubserinnerung (Tage vorher)</Label>
              <ZahlInput id="urlaub-vorlauf" v-model="form.urlaubErinnerungTage" :min="0" :max="90" class="w-32" />
            </div>
            <div class="grid flex-1 gap-2">
              <Label for="urlaub-text">Erinnerungstext</Label>
              <Input id="urlaub-text" v-model="form.urlaubErinnerungText" placeholder="z. B. Übergabe planen, Abwesenheitsnotiz einrichten" />
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
        <p v-if="!aktiveVorlagen.length" class="text-sm text-muted-foreground">
          Noch keine – z. B. „Daily Mo–Fr 09:30–09:45“.
        </p>
        <div v-for="v in aktiveVorlagen" :key="v.id" class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
          <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(v.kontoFarbe).punkt" />
          <div class="flex-1">
            <div>
              <span v-if="v.name" class="font-medium">{{ v.name }} · </span>
              <span :class="{ 'text-muted-foreground': v.name }">{{ v.aufgabeTitel ?? v.kontoName }}</span>
            </div>
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
          <Button size="icon" variant="ghost" aria-label="Bearbeiten" @click="vorlageAendern(v)">
            <Pencil />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Archivieren" title="Archivieren" @click="vorlageArchivieren(v.id, true)">
            <Archive />
          </Button>
        </div>

        <template v-if="archivierteVorlagen.length">
          <Button variant="ghost" size="sm" class="mt-2 w-fit text-muted-foreground" @click="archivOffen = !archivOffen">
            <ChevronRight class="transition-transform" :class="{ 'rotate-90': archivOffen }" />
            Archiviert ({{ archivierteVorlagen.length }})
          </Button>
          <template v-if="archivOffen">
            <div v-for="v in archivierteVorlagen" :key="v.id" class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <span class="size-2.5 shrink-0 rounded-full opacity-60" :class="kontoFarbKlassen(v.kontoFarbe).punkt" />
              <div class="flex-1">
                {{ v.name ? `${v.name} · ` : '' }}{{ v.aufgabeTitel ?? v.kontoName }}
                <span class="tabular-nums">· {{ wochentageText(v.wochentage) }} {{ formatUhrzeit(v.start) }}–{{ formatUhrzeit(v.ende) }}</span>
              </div>
              <Button size="sm" variant="ghost" @click="vorlageArchivieren(v.id, false)">
                <ArchiveRestore /> Wiederherstellen
              </Button>
              <Button size="icon" variant="ghost" aria-label="Endgültig löschen" title="Endgültig löschen" @click="vorlageLoeschen(v.id)">
                <Trash2 />
              </Button>
            </div>
          </template>
        </template>
      </CardContent>
    </Card>

    <UrlaubsAnspruch />

    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageBearbeiten" />
  </div>
</template>
