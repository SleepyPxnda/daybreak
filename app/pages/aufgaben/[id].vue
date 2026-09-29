<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from '@lucide/vue'
import { TODO_ARTEN } from '#shared/utils/todos'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const { data: aufgabe, error } = await useFetch(() => `/api/aufgaben/${id.value}`, { key: 'aufgabe-detail' })
// Plan §5.8: verknüpfte Merker (offene Einträge aller Arten mit Bezug auf diese Aufgabe)
const { data: todos } = useFetch('/api/todos', { key: 'aufgabe-todos', query: { aufgabeId: id }, default: () => [] })
const { data: notizen } = useFetch('/api/notizen', { key: 'aufgabe-notizen', query: { aufgabeId: id }, default: () => [] })

useHead({ title: () => `${aufgabe.value?.key ? `${aufgabe.value.key} ` : ''}${aufgabe.value?.titel ?? 'Aufgabe'} · Daybreak` })

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
  <div v-if="error" class="text-muted-foreground">
    Aufgabe nicht gefunden.
  </div>
  <div v-else-if="aufgabe" class="grid max-w-4xl gap-6">
    <div>
      <NuxtLink :to="`/konten?konto=${aufgabe.kontoId}`" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft class="size-4" /> {{ aufgabe.konto.name }}
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1 basis-80 space-y-1">
        <div class="flex items-center gap-2">
          <span class="size-3 rounded-full" :class="kontoFarbKlassen(aufgabe.konto.farbe).punkt" />
          <AufgabeKey v-if="aufgabe.key" :wert="aufgabe.key" :farbe="aufgabe.konto.farbe" />
          <Badge :variant="aufgabe.status === 'offen' ? 'outline' : 'secondary'">
            {{ aufgabe.status }}
          </Badge>
        </div>
        <h1 class="text-2xl font-semibold wrap-anywhere">
          {{ aufgabe.titel }}
        </h1>
      </div>
      <div class="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" @click="bearbeiten = true">
          <Pencil /> Bearbeiten
        </Button>
        <Button variant="secondary" size="sm" @click="statusUmschalten">
          <template v-if="aufgabe.status === 'offen'">
            <CheckCircle2 /> Abschließen
          </template>
          <template v-else>
            <RotateCcw /> Wieder öffnen
          </template>
        </Button>
        <Button v-if="!aufgabe.bloecke.length" variant="ghost" size="sm" @click="loeschenFrage = true">
          <Trash2 /> Löschen
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="grid gap-3">
        <div class="flex flex-wrap gap-x-8 gap-y-2 tabular-nums">
          <div>
            <div class="text-sm text-muted-foreground">
              Gebucht
            </div>
            <div class="text-xl font-semibold">
              {{ formatDauer(aufgabe.gebuchtMin) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">
              Geplant
            </div>
            <div class="text-xl">
              {{ formatDauer(aufgabe.geplantMin) }}
            </div>
          </div>
          <div v-if="aufgabe.schaetzungMin">
            <div class="text-sm text-muted-foreground">
              Schätzung
            </div>
            <div class="text-xl">
              {{ formatDauer(aufgabe.schaetzungMin) }}
            </div>
          </div>
        </div>
        <Progress v-if="fortschritt !== undefined" :model-value="fortschritt" class="h-2" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle>Notizen</CardTitle>
        <Button size="sm" variant="secondary" @click="neueNotiz(aufgabe.titel, { aufgabeId: aufgabe.id })">
          <Plus /> Notiz
        </Button>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-1 text-sm">
        <p v-if="!notizen.length" class="text-muted-foreground">
          Keine verknüpften Notizen.
        </p>
        <NuxtLink v-for="n in notizen" :key="n.id" :to="`/notizen?id=${n.id}`" class="grid grid-cols-1 gap-0.5 rounded-md px-1 py-1 hover:bg-accent/50" :title="n.titel">
          <span class="auslaufen font-medium">{{ n.titel }}</span>
          <span v-if="n.ausschnitt" class="line-clamp-1 text-xs text-muted-foreground">{{ n.ausschnitt }}</span>
        </NuxtLink>
      </CardContent>
    </Card>

    <Card v-if="todos.length">
      <CardHeader>
        <CardTitle>Merker</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-1 text-sm">
        <NuxtLink v-for="t in todos" :key="t.id" to="/todos" class="flex gap-2 hover:underline">
          <Badge variant="outline">
            {{ TODO_ARTEN.find(a => a.art === t.art)?.einzahl }}
          </Badge>
          <span class="min-w-0 wrap-anywhere"><template v-if="t.wer">{{ t.wer }}: </template>{{ t.text }}</span>
        </NuxtLink>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Blöcke</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <p v-if="!tage.length" class="text-sm text-muted-foreground">
          Noch keine Blöcke.
        </p>
        <div v-for="t in tage" :key="t.datum" class="grid gap-1">
          <div class="flex items-baseline justify-between text-sm">
            <NuxtLink :to="`/?datum=${t.datum}`" class="font-medium hover:underline">
              {{ formatTag(t.datum) }}
            </NuxtLink>
            <span class="tabular-nums text-muted-foreground">
              {{ formatDauer(t.gebucht) }}<template v-if="t.geplant"> · geplant {{ formatDauer(t.geplant) }}</template>
            </span>
          </div>
          <div v-for="b in t.bloecke" :key="b.id" class="flex gap-3 pl-3 text-sm text-muted-foreground">
            <span class="tabular-nums">{{ formatUhrzeit(b.start) }}–{{ formatUhrzeit(b.ende) }}</span>
            <span v-if="b.status === 'geplant'" class="italic">geplant</span>
            <span v-if="b.notiz" class="text-foreground">{{ b.notiz }}</span>
          </div>
        </div>
      </CardContent>
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
          <AlertDialogAction @click="loeschen">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
