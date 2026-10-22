<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, CheckCircle2, Circle, CircleCheck, CircleDot, Pencil, Plus, RotateCcw, Trash2 } from '@lucide/vue'
import { TODO_ARTEN } from '#shared/utils/todos'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const { data: aufgabe, error } = await useFetch(() => `/api/aufgaben/${id.value}`, { key: 'aufgabe-detail' })
// Plan §5.8: verknüpfte Merker (offene Einträge aller Arten mit Bezug auf diese Aufgabe)
const { data: todos } = useFetch('/api/todos', { key: 'aufgabe-todos', query: { aufgabeId: id }, default: () => [] })
const { data: notizen } = useFetch('/api/notizen', { key: 'aufgabe-notizen', query: { aufgabeId: id }, default: () => [] })

useHead({ title: () => `${aufgabe.value?.key ? `${aufgabe.value.key} ` : ''}${aufgabe.value?.titel ?? 'Aufgabe'} · daybreak` })

const bearbeiten = ref(false)
const loeschenFrage = ref(false)

const tage = computed(() => {
  const gruppen = new Map<string, NonNullable<typeof aufgabe.value>['bloecke']>()
  for (const b of aufgabe.value?.bloecke ?? []) {
    const liste = gruppen.get(b.datum) ?? []
    liste.push(b)
    gruppen.set(b.datum, liste)
  }
  return [...gruppen.entries()].reverse().map(([datum, bloecke]) => ({
    datum,
    bloecke,
    gebucht: istMinuten(bloecke),
    geplant: geplantMinuten(bloecke),
  }))
})

const fortschritt = computed(() => {
  const a = aufgabe.value
  if (!a?.schaetzungMin) return undefined
  return Math.min(100, Math.round((a.gebuchtMin / a.schaetzungMin) * 100))
})

// Anzeige-Status wie auf der Kontoseite: „In Arbeit“ = offen und schon Zeit gebucht
const statusAnzeige = computed(() => {
  if (aufgabe.value?.status === 'abgeschlossen') return { text: 'Abgeschlossen', icon: CircleCheck, klasse: 'text-positiv' }
  if (aufgabe.value?.gebuchtMin) return { text: 'In Arbeit', icon: CircleDot, klasse: 'text-info' }
  return { text: 'Offen', icon: Circle, klasse: 'text-muted-foreground' }
})

async function statusUmschalten() {
  const status = aufgabe.value?.status === 'offen' ? 'abgeschlossen' : 'offen'
  await aktion(() => api(`/api/aufgaben/${id.value}`, { method: 'PATCH', body: { status } }), ['aufgabe-detail', ...STAMMDATEN_KEYS])
}

async function loeschen() {
  const ok = await aktion(() => api(`/api/aufgaben/${id.value}`, { method: 'DELETE' }), STAMMDATEN_KEYS)
  if (ok) await navigateTo(`/konten?konto=${aufgabe.value?.kontoId}`)
}

const formatTag = (datum: string) => format(zuDate(datum), 'EEEE, d. MMMM yyyy', { locale: de })
</script>

<template>
  <div v-if="error" class="text-sm text-muted-foreground">
    Aufgabe nicht gefunden – vielleicht hat sie sich schon verzogen.
  </div>
  <div v-else-if="aufgabe" class="grid max-w-4xl gap-6">
    <div>
      <NuxtLink :to="`/konten?konto=${aufgabe.kontoId}`" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft class="size-4" /> {{ aufgabe.konto.name }}
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1 basis-80 space-y-1.5">
        <div class="flex items-center gap-2.5">
          <span class="size-3 shrink-0 rounded-full" :class="kontoFarbKlassen(aufgabe.konto.farbe).punkt" />
          <AufgabeKey v-if="aufgabe.key" :wert="aufgabe.key" :farbe="aufgabe.konto.farbe" />
          <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="statusAnzeige.klasse">
            <component :is="statusAnzeige.icon" class="size-3.5" />
            {{ statusAnzeige.text }}
          </span>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight wrap-anywhere">
          {{ aufgabe.titel }}
        </h1>
      </div>
      <div class="flex shrink-0 gap-2">
        <Button v-if="!aufgabe.bloecke.length" variant="ghost" size="icon" aria-label="Löschen" title="Löschen" @click="loeschenFrage = true">
          <Trash2 />
        </Button>
        <Button variant="outline" @click="bearbeiten = true">
          <Pencil /> Bearbeiten
        </Button>
        <Button v-if="aufgabe.status === 'offen'" @click="statusUmschalten">
          <CheckCircle2 /> Abschließen
        </Button>
        <Button v-else variant="outline" @click="statusUmschalten">
          <RotateCcw /> Wieder öffnen
        </Button>
      </div>
    </div>

    <div class="grid gap-2">
      <div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Gebucht
          </div>
          <div class="font-mono text-2xl font-medium" :class="{ 'text-negativ': aufgabe.schaetzungMin && aufgabe.gebuchtMin > aufgabe.schaetzungMin }">
            {{ formatDauer(aufgabe.gebuchtMin) }}
          </div>
        </div>
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Geplant
          </div>
          <div class="font-mono text-2xl font-medium">
            {{ formatDauer(aufgabe.geplantMin) }}
          </div>
        </div>
        <div class="bg-background p-4">
          <div class="text-[13px] text-muted-foreground">
            Schätzung
          </div>
          <div class="font-mono text-2xl font-medium text-muted-foreground">
            {{ aufgabe.schaetzungMin ? formatDauer(aufgabe.schaetzungMin) : '–' }}
          </div>
        </div>
      </div>
      <div
        v-if="fortschritt !== undefined"
        class="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="fortschritt"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Gebucht von Schätzung"
      >
        <div class="h-full rounded-full bg-primary" :style="{ width: `${fortschritt}%` }" />
      </div>
    </div>

    <Card class="gap-0 py-0">
      <CardHeader class="flex flex-row items-center justify-between py-0 pr-2">
        <CardTitle>Notizen</CardTitle>
        <Button size="sm" variant="outline" class="h-[30px] text-[13px]" @click="neueNotiz(aufgabe.titel, { aufgabeId: aufgabe.id })">
          <Plus /> Notiz
        </Button>
      </CardHeader>
      <p v-if="!notizen.length" class="px-4 py-3 text-sm text-muted-foreground">
        Keine verknüpften Notizen.
      </p>
      <NuxtLink
        v-for="n in notizen"
        :key="n.id"
        :to="`/notizen?id=${n.id}`"
        class="grid min-h-10 grid-cols-1 gap-0.5 border-b px-4 py-2 text-sm last:border-b-0 hover:bg-raised"
        :title="n.titel"
      >
        <span class="auslaufen font-medium">{{ n.titel }}</span>
        <span v-if="n.ausschnitt" class="line-clamp-1 text-xs text-muted-foreground">{{ n.ausschnitt }}</span>
      </NuxtLink>
    </Card>

    <Card v-if="todos.length" class="gap-0 py-0">
      <CardHeader>
        <CardTitle class="flex items-center justify-between gap-2">
          Merker
          <span class="font-mono text-xs font-normal text-muted-foreground">{{ todos.length }}</span>
        </CardTitle>
      </CardHeader>
      <NuxtLink
        v-for="t in todos"
        :key="t.id"
        to="/todos"
        class="flex min-h-10 items-center gap-2.5 border-b px-4 py-1.5 text-sm last:border-b-0 hover:bg-raised"
      >
        <span class="inline-flex h-[22px] w-24 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {{ TODO_ARTEN.find(a => a.art === t.art)?.einzahl }}
        </span>
        <span class="min-w-0 wrap-anywhere"><span v-if="t.wer" class="text-muted-foreground">{{ t.wer }}: </span>{{ t.text }}</span>
      </NuxtLink>
    </Card>

    <Card class="gap-0 py-0">
      <CardHeader>
        <CardTitle>Blöcke</CardTitle>
      </CardHeader>
      <p v-if="!tage.length" class="px-4 py-3 text-sm text-muted-foreground">
        Noch keine Blöcke – der Kalender ist hier noch wolkenlos.
      </p>
      <div v-for="t in tage" :key="t.datum" class="grid gap-1 border-b px-4 py-3 last:border-b-0">
        <div class="flex items-baseline justify-between gap-4 text-sm">
          <NuxtLink :to="`/?datum=${t.datum}`" class="font-medium hover:underline">
            {{ formatTag(t.datum) }}
          </NuxtLink>
          <span class="font-mono text-[13px] text-muted-foreground">
            {{ formatDauer(t.gebucht) }}<template v-if="t.geplant"> · geplant {{ formatDauer(t.geplant) }}</template>
          </span>
        </div>
        <div v-for="b in t.bloecke" :key="b.id" class="flex gap-3 text-sm text-muted-foreground">
          <span class="font-mono text-[13px]">{{ formatUhrzeit(b.start) }}–{{ formatUhrzeit(b.ende) }}</span>
          <span v-if="b.status === 'geplant'" class="italic">geplant</span>
          <span v-if="b.notiz" class="text-foreground">{{ b.notiz }}</span>
        </div>
      </div>
    </Card>

    <AufgabeDialog v-model:open="bearbeiten" :aufgabe="aufgabe" />
    <AlertDialog v-model:open="loeschenFrage">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{{ aufgabe.titel }}“ hat keine Blöcke und wird endgültig gelöscht.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="loeschen">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
