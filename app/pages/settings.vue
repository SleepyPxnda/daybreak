<script setup lang="ts">
import { ChevronRight, CircleAlert, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Settings } from '#shared/utils/settings'
import { FEDERAL_STATES } from '#shared/utils/settings'
import type { TemplateForm } from '~/components/TemplateDialog.vue'

useHead({ title: 'Einstellungen · daybreak' })

const { data: settings } = await useSettings()
const { data: templates } = await useFetch('/api/templates', { key: 'templates', default: () => [] })

// Form state (hours instead of minutes where more readable)
const form = reactive({
  targetProDayHours: 8,
  workdays: [1, 2, 3, 4, 5] as number[],
  federalState: 'BW' as Settings['federalState'],
  workStart: 480,
  timelineFrom: 420,
  timelineTo: 1140,
  startDate: today(),
  startBalanceHours: 0,
  vacationNoticeDays: 7,
  vacationNoticeText: '',
  bookingNotificationsEnabled: false,
  bookingNotificationGapHours: 2,
  bookingNotificationEndOfDay: 990,
})

type FormValues = { [Field in keyof typeof form]: (typeof form)[Field] }

function formValuesFrom(stored: Settings): FormValues {
  return {
    targetProDayHours: stored.targetPerDayMin / 60,
    workdays: [...stored.workdays],
    federalState: stored.federalState,
    workStart: stored.workStart,
    timelineFrom: stored.timelineFrom,
    timelineTo: stored.timelineTo,
    startDate: stored.balanceStart.date,
    startBalanceHours: stored.balanceStart.balanceMin / 60,
    vacationNoticeDays: stored.vacationNoticeDays,
    vacationNoticeText: stored.vacationNoticeText,
    bookingNotificationsEnabled: stored.bookingNotificationsEnabled,
    bookingNotificationGapHours: stored.bookingNotificationGapMin / 60,
    bookingNotificationEndOfDay: stored.bookingNotificationEndOfDay,
  }
}

// Last server state copied into the form: new server values only replace the form while it has no unsaved changes
let lastCopiedJson: string | null = null

function copyStoredSettingsIntoForm(stored: Settings) {
  const values = formValuesFrom(stored)
  Object.assign(form, values)
  lastCopiedJson = JSON.stringify(values)
}

watch(settings, (stored) => {
  if (!stored) return
  const formHasUnsavedChanges = lastCopiedJson !== null && JSON.stringify(toRaw(form)) !== lastCopiedJson
  if (!formHasUnsavedChanges) copyStoredSettingsIntoForm(stored)
}, { immediate: true })

// Browser permission is per browser, the setting is stored server-side - show both
const permission = ref<NotificationPermission | 'nicht-unterstuetzt'>('default')
onMounted(() => {
  permission.value = 'Notification' in window ? Notification.permission : 'nicht-unterstuetzt'
})

async function bookingNotificationsToggle(enabled: boolean) {
  if (!enabled) {
    form.bookingNotificationsEnabled = false
    return
  }
  if (!('Notification' in window)) {
    toast.error('Dieser Browser unterstützt hier keine Benachrichtigungen (nur über HTTPS oder localhost).')
    return
  }
  permission.value = await Notification.requestPermission()
  form.bookingNotificationsEnabled = permission.value === 'granted'
  if (!form.bookingNotificationsEnabled) toast.error('Benachrichtigungen sind im Browser blockiert.')
}

async function save() {
  const ok = await runAction(() => api('/api/settings', {
    method: 'PUT',
    body: {
      targetPerDayMin: snapToGrid(form.targetProDayHours * 60),
      workdays: form.workdays,
      federalState: form.federalState,
      workStart: form.workStart,
      timelineFrom: form.timelineFrom,
      timelineTo: form.timelineTo,
      balanceStart: { date: form.startDate, balanceMin: Math.round(form.startBalanceHours * 60) },
      vacationNoticeDays: Math.max(0, Math.round(form.vacationNoticeDays || 0)),
      vacationNoticeText: form.vacationNoticeText,
      bookingNotificationsEnabled: form.bookingNotificationsEnabled,
      bookingNotificationGapMin: Math.min(480, Math.max(30, snapToGrid((form.bookingNotificationGapHours || 0) * 60))),
      bookingNotificationEndOfDay: form.bookingNotificationEndOfDay,
    },
  }), ['settings', 'balance', 'next-vacation'])
  if (ok) {
    // runAction() has refreshed settings already, but the form still counts as changed - copy the normalised stored values explicitly
    if (settings.value) copyStoredSettingsIntoForm(settings.value)
    toast.success('Einstellungen gespeichert')
  }
}

const templateDialog = ref(false)
const templateEdit = ref<TemplateForm | null>(null)

function templateNew() {
  templateEdit.value = null
  templateDialog.value = true
}

function templateChange(v: TemplateForm) {
  templateEdit.value = v
  templateDialog.value = true
}

async function templateRemove(id: number) {
  await runAction(() => api(`/api/templates/${id}`, { method: 'DELETE' }), ['templates'])
}

/** Archiving = no new appointments; future planned blocks disappear, past/booked ones stay */
async function templateArchive(id: number, archive: boolean) {
  const ok = await runAction(() => api(`/api/templates/${id}`, { method: 'PATCH', body: { active: !archive } }), ['templates', 'day-blocks'])
  if (ok) toast.success(archive ? 'Archiviert' : 'Wiederhergestellt')
}

const activeTemplates = computed(() => templates.value.filter(v => v.active))
const archivedTemplates = computed(() => templates.value.filter(v => !v.active))
const archiveOpen = ref(false)
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
      <form @submit.prevent="save">
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
                <Label for="target" class="text-xs font-normal text-muted-foreground">Soll pro Tag (Stunden)</Label>
                <NumberInput id="target" v-model="form.targetProDayHours" :min="0" :max="24" :step="0.25" class="w-32" />
              </div>
              <div class="grid gap-1">
                <Label class="text-xs font-normal text-muted-foreground">Bundesland (Feiertage)</Label>
                <Select v-model="form.federalState">
                  <SelectTrigger class="w-24 rounded-md data-[size=default]:h-9" aria-label="Bundesland">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="b in FEDERAL_STATES" :key="b" :value="b">
                      {{ b }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="grid gap-1">
              <span class="text-xs text-muted-foreground">Arbeitstage</span>
              <WeekdayPicker v-model="form.workdays" />
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
              <TimeInput v-model="form.workStart" />
            </div>
            <div class="grid gap-1">
              <Label class="text-xs font-normal text-muted-foreground">Timeline von</Label>
              <TimeInput v-model="form.timelineFrom" />
            </div>
            <div class="grid gap-1">
              <Label class="text-xs font-normal text-muted-foreground">Timeline bis</Label>
              <TimeInput v-model="form.timelineTo" />
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
              <Label for="start-date" class="text-xs font-normal text-muted-foreground">Stundenkonto ab</Label>
              <Input id="start-date" v-model="form.startDate" type="date" required class="h-9 w-40 rounded-md font-mono" />
            </div>
            <div class="grid gap-1">
              <Label for="start-balance" class="text-xs font-normal text-muted-foreground">Startsaldo (Stunden, ±)</Label>
              <NumberInput id="start-balance" v-model="form.startBalanceHours" :step="0.25" class="w-32" />
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
              <Switch id="booking-notifications" :model-value="form.bookingNotificationsEnabled" @update:model-value="bookingNotificationsToggle" />
              <Label for="booking-notifications">Browser-Erinnerungen ans Buchen</Label>
            </div>
            <p v-if="form.bookingNotificationsEnabled && permission !== 'granted'" class="flex items-start gap-2 rounded-xl border bg-error-subtle px-4 py-2.5 text-sm">
              <CircleAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
              <span><span class="font-medium text-destructive">Nicht erlaubt:</span> In diesem Browser sind Benachrichtigungen nicht erlaubt – Schalter aus- und wieder einschalten oder in den Website-Einstellungen freigeben.</span>
            </p>
            <div class="flex flex-wrap gap-3">
              <template v-if="form.bookingNotificationsEnabled">
                <div class="grid gap-1">
                  <Label for="booking-notification-gap" class="text-xs font-normal text-muted-foreground">Erinnern nach (Stunden ohne Buchung)</Label>
                  <NumberInput id="booking-notification-gap" v-model="form.bookingNotificationGapHours" :min="0.5" :max="8" :step="0.25" class="w-32" />
                </div>
                <div class="grid gap-1">
                  <Label class="text-xs font-normal text-muted-foreground">Feierabend-Erinnerung ab</Label>
                  <TimeInput v-model="form.bookingNotificationEndOfDay" />
                </div>
              </template>
              <div class="grid gap-1">
                <Label for="vacation-lead" class="text-xs font-normal text-muted-foreground">Urlaubserinnerung (Tage vorher)</Label>
                <NumberInput id="vacation-lead" v-model="form.vacationNoticeDays" :min="0" :max="90" class="w-32" />
              </div>
            </div>
            <div class="grid gap-1">
              <Label for="vacation-text" class="text-xs font-normal text-muted-foreground">Erinnerungstext</Label>
              <Input id="vacation-text" v-model="form.vacationNoticeText" placeholder="z. B. Übergabe planen, Abwesenheitsnotiz einrichten" class="h-9 rounded-md" />
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
        <Button size="sm" variant="outline" @click="templateNew">
          <Plus /> Vorlage
        </Button>
      </CardHeader>
      <p v-if="!activeTemplates.length" class="border-b px-4 py-3 text-sm text-muted-foreground last:border-b-0">
        Noch keine – z. B. „Daily Mo–Fr 09:30–09:45“.
      </p>
      <div v-for="v in activeTemplates" :key="v.id" class="flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm last:border-b-0">
        <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(v.accountColor).dot" />
        <div class="min-w-0 flex-1">
          <div>
            <template v-if="v.name">
              {{ v.name }} <span class="text-[13px] text-muted-foreground">· {{ v.taskTitle ?? v.accountName }}</span>
            </template>
            <template v-else>
              {{ v.taskTitle ?? v.accountName }}
            </template>
          </div>
          <div class="font-mono text-xs text-muted-foreground">
            {{ weekdaysText(v.weekdays) }} · {{ formatTime(v.start) }}–{{ formatTime(v.end) }}
            <template v-if="v.intervalWeeks > 1">
              · jede {{ v.intervalWeeks }}. Woche
            </template>
            <template v-if="v.validUntil">
              · bis {{ v.validUntil }}
            </template>
          </div>
        </div>
        <Button size="sm" variant="ghost" class="h-[30px]" @click="templateChange(v)">
          Bearbeiten
        </Button>
        <Button size="sm" variant="ghost" class="h-[30px]" @click="templateArchive(v.id, true)">
          Archivieren
        </Button>
      </div>

      <template v-if="archivedTemplates.length">
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-2 border-b bg-card px-4 text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground"
          :aria-expanded="archiveOpen"
          @click="archiveOpen = !archiveOpen"
        >
          <ChevronRight class="size-3.5 transition-transform" :class="{ 'rotate-90': archiveOpen }" />
          Archiviert
          <span class="font-mono text-xs font-normal">{{ archivedTemplates.length }}</span>
        </button>
        <template v-if="archiveOpen">
          <div v-for="v in archivedTemplates" :key="v.id" class="flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm text-muted-foreground last:border-b-0">
            <span class="size-2 shrink-0 rounded-full opacity-60" :class="accountColorClasses(v.accountColor).dot" />
            <div class="min-w-0 flex-1">
              {{ v.name ? `${v.name} · ` : '' }}{{ v.taskTitle ?? v.accountName }}
              <span class="font-mono text-xs">· {{ weekdaysText(v.weekdays) }} {{ formatTime(v.start) }}–{{ formatTime(v.end) }}</span>
            </div>
            <Button size="sm" variant="ghost" class="h-[30px]" @click="templateArchive(v.id, false)">
              Wiederherstellen
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Endgültig löschen" title="Endgültig löschen" @click="templateRemove(v.id)">
              <Trash2 />
            </Button>
          </div>
        </template>
      </template>
    </Card>

    <VacationEntitlement />

    <TemplateDialog v-model:open="templateDialog" :template="templateEdit" />
  </div>
</template>
