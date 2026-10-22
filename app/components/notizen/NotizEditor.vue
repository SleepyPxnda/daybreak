<script setup lang="ts">
import { format } from 'date-fns'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Check, CircleAlert, Pin, Trash2 } from '@lucide/vue'
import { normalisiereTags } from '#shared/utils/notizen'

interface Notiz {
  id: number
  titel: string
  inhalt: string
  tags: string[]
  aufgabeId: number | null
  kontoId: number | null
  angepinnt: boolean
  geaendertAm: string
}

// Editor mit Live-Vorschau und Autosave (Plan §5.7)
const props = defineProps<{ id: number }>()

const form = reactive({ titel: '', inhalt: '', tagsText: '', ziel: '', angepinnt: false })
const geladen = ref(false)
const nichtGefunden = ref(false)
const status = ref<'gespeichert' | 'aenderung' | 'speichert' | 'fehler'>('gespeichert')
const gespeichertUm = ref<string>()

/** Zuletzt gespeicherter Stand der Notiz, auf die sich `gespeicherterStand` bezieht */
let aktuelleId = 0
let gespeicherterStand = ''

function nutzdaten() {
  return {
    titel: form.titel.trim() || 'Ohne Titel',
    inhalt: form.inhalt,
    tags: normalisiereTags(form.tagsText),
    ...zielAusWert(form.ziel),
    angepinnt: form.angepinnt,
  }
}

const istGeaendert = () => geladen.value && JSON.stringify(nutzdaten()) !== gespeicherterStand

async function speichern() {
  if (!istGeaendert()) return
  const id = aktuelleId
  const daten = nutzdaten()
  const stand = JSON.stringify(daten)
  status.value = 'speichert'
  const ok = await aktion(() => api<Notiz>(`/api/notizen/${id}`, { method: 'PATCH', body: daten }), NOTIZ_KEYS)
  if (id !== aktuelleId) return // inzwischen andere Notiz geöffnet
  if (ok) {
    gespeicherterStand = stand
    gespeichertUm.value = format(new Date(), 'HH:mm')
    status.value = istGeaendert() ? 'aenderung' : 'gespeichert'
  }
  else {
    status.value = 'fehler'
  }
}

const speichernVerzoegert = useDebounceFn(speichern, 800)

watch(form, () => {
  if (!istGeaendert()) return
  status.value = 'aenderung'
  speichernVerzoegert()
}, { deep: true })

async function laden(id: number) {
  geladen.value = false
  nichtGefunden.value = false
  try {
    const n = await api<Notiz>(`/api/notizen/${id}`)
    aktuelleId = id
    form.titel = n.titel
    form.inhalt = n.inhalt
    form.tagsText = n.tags.join(', ')
    form.ziel = zielWert(n)
    form.angepinnt = n.angepinnt
    gespeicherterStand = JSON.stringify(nutzdaten())
    gespeichertUm.value = format(new Date(n.geaendertAm), 'dd.MM. HH:mm')
    status.value = 'gespeichert'
    geladen.value = true
  }
  catch {
    nichtGefunden.value = true
  }
}

// Beim Wechsel der Notiz zuerst offene Änderungen der alten speichern
watch(() => props.id, async (neu, alt) => {
  if (alt !== undefined) await speichern()
  await laden(neu)
}, { immediate: true })

onBeforeUnmount(() => {
  speichern()
})

// Strg+S speichert sofort
useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    speichern()
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'speichert': return 'Speichert …'
    case 'aenderung': return 'Ungespeichert'
    case 'fehler': return 'Speichern fehlgeschlagen'
    default: return gespeichertUm.value ? `Gespeichert · ${gespeichertUm.value}` : 'Gespeichert'
  }
})

const loeschenFrage = ref(false)
async function loeschen() {
  const ok = await aktion(() => api(`/api/notizen/${aktuelleId}`, { method: 'DELETE' }), NOTIZ_KEYS)
  if (ok) {
    geladen.value = false
    await navigateTo('/notizen')
  }
}

const vorschau = computed(() => renderMarkdown(form.inhalt))
</script>

<template>
  <div v-if="nichtGefunden" class="py-10 text-center text-sm text-muted-foreground">
    Notiz nicht gefunden.
  </div>
  <div v-else-if="geladen" class="grid gap-4">
    <div class="flex items-center gap-2">
      <input
        v-model="form.titel"
        aria-label="Titel"
        placeholder="Titel"
        class="min-w-0 flex-1 rounded-md bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
      <span
        class="inline-flex shrink-0 items-center gap-1.5 text-[13px] tabular-nums"
        :class="{
          'text-positiv': status === 'gespeichert',
          'text-destructive': status === 'fehler',
          'text-muted-foreground': status === 'aenderung' || status === 'speichert',
        }"
        role="status"
      >
        <Check v-if="status === 'gespeichert'" class="size-3.5" />
        <CircleAlert v-else-if="status === 'fehler'" class="size-3.5" />
        {{ statusText }}
      </span>
      <Button
        size="icon"
        variant="ghost"
        :class="{ 'text-primary hover:text-primary': form.angepinnt }"
        :aria-label="form.angepinnt ? 'Lösen' : 'Anpinnen'"
        :aria-pressed="form.angepinnt"
        :title="form.angepinnt ? 'Lösen' : 'Anpinnen (erscheint auf „Heute“)'"
        @click="form.angepinnt = !form.angepinnt"
      >
        <Pin />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Notiz löschen" title="Löschen" @click="loeschenFrage = true">
        <Trash2 />
      </Button>
    </div>

    <div class="flex flex-wrap gap-3">
      <div class="grid flex-[1_1_240px] gap-1">
        <label for="notiz-tags" class="text-xs text-muted-foreground">Tags</label>
        <Input id="notiz-tags" v-model="form.tagsText" placeholder="durch Komma getrennt" class="h-9 rounded-md" />
      </div>
      <div class="grid min-w-0 flex-[1_1_240px] gap-1">
        <span class="text-xs text-muted-foreground">Bezug</span>
        <div class="flex min-w-0 gap-2">
          <ZielAuswahl v-model="form.ziel" />
          <Button v-if="form.ziel" variant="ghost" @click="form.ziel = ''">
            Bezug entfernen
          </Button>
        </div>
      </div>
    </div>

    <div class="grid min-h-[60vh] overflow-hidden rounded-xl border lg:grid-cols-2">
      <div class="flex flex-col bg-card max-lg:border-b lg:border-r">
        <div class="border-b bg-card px-4 py-2 text-xs text-muted-foreground">
          Markdown
        </div>
        <textarea
          v-model="form.inhalt"
          aria-label="Inhalt (Markdown)"
          placeholder="Markdown …"
          class="min-h-[40vh] flex-1 resize-y bg-transparent p-4 font-mono text-[13px] leading-5 outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div class="flex min-w-0 flex-col">
        <div class="border-b bg-card px-4 py-2 text-xs text-muted-foreground">
          Vorschau
        </div>
        <ClientOnly>
          <div class="markdown flex-1 overflow-auto px-5 py-4">
            <!-- eslint-disable-next-line vue/no-v-html -- mit DOMPurify bereinigt -->
            <div v-if="form.inhalt.trim()" v-html="vorschau" />
            <p v-else class="text-sm text-muted-foreground">
              Noch leer – links schreiben, hier erscheint die Vorschau.
            </p>
          </div>
        </ClientOnly>
      </div>
    </div>

    <AlertDialog v-model:open="loeschenFrage">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{{ form.titel }}“ wird endgültig gelöscht.</AlertDialogDescription>
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
