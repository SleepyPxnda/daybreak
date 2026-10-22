<script setup lang="ts">
import { ChevronRight, CircleAlert, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Einstellungen } from '#shared/utils/einstellungen'
import { BUNDESLAENDER } from '#shared/utils/einstellungen'
import type { VorlageFormular } from '~/components/VorlageDialog.vue'

useHead({ title: 'Einstellungen · daybreak' })

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
  erinnerungenAktiv: false,
  erinnerungLueckeStunden: 2,
  erinnerungFeierabend: 990,
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
  form.erinnerungenAktiv = e.erinnerungenAktiv
  form.erinnerungLueckeStunden = e.erinnerungLueckeMin / 60
  form.erinnerungFeierabend = e.erinnerungFeierabend
})

// Browser-Erlaubnis gilt pro Browser, die Einstellung serverseitig – beides anzeigen
const erlaubnis = ref<NotificationPermission | 'nicht-unterstuetzt'>('default')
onMounted(() => {
  erlaubnis.value = 'Notification' in window ? Notification.permission : 'nicht-unterstuetzt'
})

async function erinnerungenUmschalten(an: boolean) {
  if (!an) {
    form.erinnerungenAktiv = false
    return
  }
  if (!('Notification' in window)) {
    toast.error('Dieser Browser unterstützt hier keine Benachrichtigungen (nur über HTTPS oder localhost).')
    return
  }
  erlaubnis.value = await Notification.requestPermission()
  form.erinnerungenAktiv = erlaubnis.value === 'granted'
  if (!form.erinnerungenAktiv) toast.error('Benachrichtigungen sind im Browser blockiert.')
}

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
      erinnerungenAktiv: form.erinnerungenAktiv,
      erinnerungLueckeMin: Math.min(480, Math.max(30, aufRaster((form.erinnerungLueckeStunden || 0) * 60))),
      erinnerungFeierabend: form.erinnerungFeierabend,
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
  <div class="grid max-w-[920px] gap-6">
    <h1 class="text-2xl font-semibold tracking-tight">
      Einstellungen
    </h1>

    <Card class="gap-0 py-0">
      <CardHeader class="min-h-[52px]">
        <CardTitle class="text-[17px]">
          Arbeitszeit & Stundenkonto
        </CardTitle>
      </CardHeader>
      <form @submit.prevent="speichern">
        <section class="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-x-8 gap-y-4 border-b px-4 py-5 max-md:grid-cols-1">
          <div>
            <h2 class="text-sm font-medium">
              Soll & Arbeitstage
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Gilt, solange ein Tag kein eigenes Soll hat.
            </p>
          </div>
          <div class="grid gap-4">
            <div class="flex flex-wrap gap-3">
              <div class="grid gap-1">
                <Label for="soll" class="text-xs font-normal text-muted-foreground">Soll pro Tag (Stunden)</Label>
                <ZahlInput id="soll" v-model="form.sollProTagStunden" :min="0" :max="24" :step="0.25" class="w-32" />
              </div>
              <div class="grid gap-1">
                <Label class="text-xs font-normal text-muted-foreground">Bundesland (Feiertage)</Label>
                <Select v-model="form.bundesland">
                  <SelectTrigger class="w-24 rounded-md data-[size=default]:h-9" aria-label="Bundesland">
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
            <div class="grid gap-1">
              <span class="text-xs text-muted-foreground">Arbeitstage</span>
              <WochentagAuswahl v-model="form.arbeitstage" />
            </div>
          </div>
        </section>

        <section class="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-x-8 gap-y-4 border-b px-4 py-5 max-md:grid-cols-1">
          <div>
            <h2 class="text-sm font-medium">
              Zeitleiste
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Sichtbarer Bereich auf „Heute“ und „Woche“.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <div class="grid gap-1">
              <Label class="text-xs font-normal text-muted-foreground">Arbeitsbeginn</Label>
              <UhrzeitInput v-model="form.arbeitsbeginn" />
            </div>
            <div class="grid gap-1">
              <Label class="text-xs font-normal text-muted-foreground">Timeline von</Label>
              <UhrzeitInput v-model="form.timelineVon" />
            </div>
            <div class="grid gap-1">
              <Label class="text-xs font-normal text-muted-foreground">Timeline bis</Label>
              <UhrzeitInput v-model="form.timelineBis" />
            </div>
          </div>
        </section>

        <section class="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-x-8 gap-y-4 border-b px-4 py-5 max-md:grid-cols-1">
          <div>
            <h2 class="text-sm font-medium">
              Stundenkonto
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Ab diesem Tag wird der Saldo berechnet.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <div class="grid gap-1">
              <Label for="start-datum" class="text-xs font-normal text-muted-foreground">Stundenkonto ab</Label>
              <Input id="start-datum" v-model="form.startDatum" type="date" required class="h-9 w-40 rounded-md font-mono" />
            </div>
            <div class="grid gap-1">
              <Label for="start-saldo" class="text-xs font-normal text-muted-foreground">Startsaldo (Stunden, ±)</Label>
              <ZahlInput id="start-saldo" v-model="form.startSaldoStunden" :step="0.25" class="w-32" />
            </div>
          </div>
        </section>

        <section class="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-x-8 gap-y-4 border-b px-4 py-5 max-md:grid-cols-1">
          <div>
            <h2 class="text-sm font-medium">
              Erinnerungen
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Nur an Arbeitstagen und solange ein Daybreak-Tab offen ist: wenn länger nichts gebucht wurde und ab Feierabend, falls das Soll noch nicht erreicht ist.
            </p>
          </div>
          <div class="grid gap-4">
            <div class="flex items-center gap-2.5">
              <Switch id="erinnerungen" :model-value="form.erinnerungenAktiv" @update:model-value="erinnerungenUmschalten" />
              <Label for="erinnerungen">Browser-Erinnerungen ans Buchen</Label>
            </div>
            <p v-if="form.erinnerungenAktiv && erlaubnis !== 'granted'" class="flex items-start gap-2 rounded-xl border bg-fehler-subtle px-4 py-2.5 text-sm">
              <CircleAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
              <span><span class="font-medium text-destructive">Nicht erlaubt:</span> In diesem Browser sind Benachrichtigungen nicht erlaubt – Schalter aus- und wieder einschalten oder in den Website-Einstellungen freigeben.</span>
            </p>
            <div class="flex flex-wrap gap-3">
              <template v-if="form.erinnerungenAktiv">
                <div class="grid gap-1">
                  <Label for="erinnerung-luecke" class="text-xs font-normal text-muted-foreground">Erinnern nach (Stunden ohne Buchung)</Label>
                  <ZahlInput id="erinnerung-luecke" v-model="form.erinnerungLueckeStunden" :min="0.5" :max="8" :step="0.25" class="w-32" />
                </div>
                <div class="grid gap-1">
                  <Label class="text-xs font-normal text-muted-foreground">Feierabend-Erinnerung ab</Label>
                  <UhrzeitInput v-model="form.erinnerungFeierabend" />
                </div>
              </template>
              <div class="grid gap-1">
                <Label for="urlaub-vorlauf" class="text-xs font-normal text-muted-foreground">Urlaubserinnerung (Tage vorher)</Label>
                <ZahlInput id="urlaub-vorlauf" v-model="form.urlaubErinnerungTage" :min="0" :max="90" class="w-32" />
              </div>
            </div>
            <div class="grid gap-1">
              <Label for="urlaub-text" class="text-xs font-normal text-muted-foreground">Erinnerungstext</Label>
              <Input id="urlaub-text" v-model="form.urlaubErinnerungText" placeholder="z. B. Übergabe planen, Abwesenheitsnotiz einrichten" class="h-9 rounded-md" />
            </div>
          </div>
        </section>

        <div class="flex justify-end gap-2 bg-card px-4 py-3">
          <Button type="submit">
            Speichern
          </Button>
        </div>
      </form>
    </Card>

    <Card class="gap-0 py-0">
      <CardHeader class="flex min-h-[52px] flex-row items-center justify-between py-0 pr-2">
        <CardTitle class="text-[17px]">
          Wiederkehrende Blöcke
        </CardTitle>
        <Button size="sm" variant="outline" @click="vorlageNeu">
          <Plus /> Vorlage
        </Button>
      </CardHeader>
      <p v-if="!aktiveVorlagen.length" class="border-b px-4 py-3 text-sm text-muted-foreground last:border-b-0">
        Noch keine – z. B. „Daily Mo–Fr 09:30–09:45“.
      </p>
      <div v-for="v in aktiveVorlagen" :key="v.id" class="flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm last:border-b-0">
        <span class="size-2 shrink-0 rounded-full" :class="kontoFarbKlassen(v.kontoFarbe).punkt" />
        <div class="min-w-0 flex-1">
          <div>
            <template v-if="v.name">
              {{ v.name }} <span class="text-[13px] text-muted-foreground">· {{ v.aufgabeTitel ?? v.kontoName }}</span>
            </template>
            <template v-else>
              {{ v.aufgabeTitel ?? v.kontoName }}
            </template>
          </div>
          <div class="font-mono text-xs text-muted-foreground">
            {{ wochentageText(v.wochentage) }} · {{ formatUhrzeit(v.start) }}–{{ formatUhrzeit(v.ende) }}
            <template v-if="v.intervallWochen > 1">
              · jede {{ v.intervallWochen }}. Woche
            </template>
            <template v-if="v.gueltigBis">
              · bis {{ v.gueltigBis }}
            </template>
          </div>
        </div>
        <Button size="sm" variant="ghost" class="h-[30px]" @click="vorlageAendern(v)">
          Bearbeiten
        </Button>
        <Button size="sm" variant="ghost" class="h-[30px]" @click="vorlageArchivieren(v.id, true)">
          Archivieren
        </Button>
      </div>

      <template v-if="archivierteVorlagen.length">
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-2 border-b bg-card px-4 text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground"
          :aria-expanded="archivOffen"
          @click="archivOffen = !archivOffen"
        >
          <ChevronRight class="size-3.5 transition-transform" :class="{ 'rotate-90': archivOffen }" />
          Archiviert
          <span class="font-mono text-xs font-normal">{{ archivierteVorlagen.length }}</span>
        </button>
        <template v-if="archivOffen">
          <div v-for="v in archivierteVorlagen" :key="v.id" class="flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm text-muted-foreground last:border-b-0">
            <span class="size-2 shrink-0 rounded-full opacity-60" :class="kontoFarbKlassen(v.kontoFarbe).punkt" />
            <div class="min-w-0 flex-1">
              {{ v.name ? `${v.name} · ` : '' }}{{ v.aufgabeTitel ?? v.kontoName }}
              <span class="font-mono text-xs">· {{ wochentageText(v.wochentage) }} {{ formatUhrzeit(v.start) }}–{{ formatUhrzeit(v.ende) }}</span>
            </div>
            <Button size="sm" variant="ghost" class="h-[30px]" @click="vorlageArchivieren(v.id, false)">
              Wiederherstellen
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Endgültig löschen" title="Endgültig löschen" @click="vorlageLoeschen(v.id)">
              <Trash2 />
            </Button>
          </div>
        </template>
      </template>
    </Card>

    <UrlaubsAnspruch />

    <VorlageDialog v-model:open="vorlageDialog" :vorlage="vorlageBearbeiten" />
  </div>
</template>
