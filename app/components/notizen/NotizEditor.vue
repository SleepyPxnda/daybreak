<script setup lang="ts">
import { format } from 'date-fns'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Pin, PinOff, Trash2 } from '@lucide/vue'
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
  <div v-if="nichtGefunden" class="py-10 text-center text-muted-foreground">
    Notiz nicht gefunden.
  </div>
  <div v-else-if="geladen" class="grid gap-4">
    <div class="flex items-start gap-3">
      <Input
        v-model="form.titel"
        aria-label="Titel"
        placeholder="Titel"
        class="h-auto border-transparent bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:border-input focus-visible:px-2 md:text-2xl"
      />
      <span class="mt-2 shrink-0 text-xs text-muted-foreground tabular-nums" :class="{ 'text-destructive': status === 'fehler' }">{{ statusText }}</span>
      <Button
        size="icon"
        variant="ghost"
        :aria-label="form.angepinnt ? 'Lösen' : 'Anpinnen'"
        :title="form.angepinnt ? 'Lösen' : 'Anpinnen (erscheint auf „Heute“)'"
        @click="form.angepinnt = !form.angepinnt"
      >
        <PinOff v-if="form.angepinnt" />
        <Pin v-else />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Löschen" title="Löschen" @click="loeschenFrage = true">
        <Trash2 />
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Input v-model="form.tagsText" placeholder="Tags, durch Komma getrennt" class="w-72" aria-label="Tags" />
      <div class="flex min-w-72 flex-1 gap-2">
        <ZielAuswahl v-model="form.ziel" />
        <Button v-if="form.ziel" variant="ghost" @click="form.ziel = ''">
          Bezug entfernen
        </Button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Textarea
        v-model="form.inhalt"
        aria-label="Inhalt (Markdown)"
        placeholder="Markdown …"
        class="min-h-[60vh] resize-y font-mono text-sm"
      />
      <ClientOnly>
        <div class="markdown min-h-[60vh] overflow-auto rounded-md border bg-card p-4">
          <!-- eslint-disable-next-line vue/no-v-html -- mit DOMPurify bereinigt -->
          <div v-if="form.inhalt.trim()" v-html="vorschau" />
          <p v-else class="text-muted-foreground">
            Vorschau
          </p>
        </div>
      </ClientOnly>
    </div>

    <AlertDialog v-model:open="loeschenFrage">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{{ form.titel }}“ wird endgültig gelöscht.</AlertDialogDescription>
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
