<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { AlarmClockCheck, GripVertical, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { parseQuickInput } from '#shared/utils/quickInput'
import type { TodoArt } from '#shared/utils/todos'
import { alterText, istFaellig, stichtag, tageSeit } from '#shared/utils/todos'
import type { TodoZeile } from '~/composables/useTodos'
import TodoDialog from './TodoDialog.vue'

const props = defineProps<{
  art: TodoArt
  todos: TodoZeile[]
  /** Kompakt (Heute-Seitenspalte): ohne Sortieren und ohne Eingabefeld */
  kompakt?: boolean
  leerText?: string
}>()

const PRAEFIX: Record<TodoArt, string> = { merker: 't', daily: 'd', warten: 'w' }
const PLATZHALTER: Record<TodoArt, string> = {
  merker: 'Merker hinzufügen … (bis fr)',
  warten: 'Tim: PR-Review … (bis fr)',
  daily: 'Daily-Thema hinzufügen …',
}

const heuteDatum = heute()

// --- Drag & Drop-Sortierung (lokale Kopie für sofortiges Feedback) ---
const liste = ref<TodoZeile[]>([])
watch(() => props.todos, (neu) => { liste.value = [...neu] }, { immediate: true })
const gezogen = ref<number | null>(null)

/** Heute-Seite: Merker lassen sich auf die Timeline ziehen (→ 30-min-Block geplant) */
const aufTimelineZiehbar = computed(() => props.kompakt && props.art === 'merker')

function dragStart(e: DragEvent, id: number) {
  if (!e.dataTransfer) return
  if (aufTimelineZiehbar.value) {
    e.dataTransfer.setData(DRAG_MERKER, String(id))
    e.dataTransfer.effectAllowed = 'copy'
    return
  }
  gezogen.value = id
  e.dataTransfer.setData('text/plain', '') // Firefox startet Drag nur mit Daten
  e.dataTransfer.effectAllowed = 'move'
}

function dragOver(e: DragEvent, zielId: number) {
  if (gezogen.value === null || gezogen.value === zielId) return
  e.preventDefault()
  const von = liste.value.findIndex(t => t.id === gezogen.value)
  const nach = liste.value.findIndex(t => t.id === zielId)
  if (von < 0 || nach < 0) return
  const kopie = [...liste.value]
  kopie.splice(nach, 0, kopie.splice(von, 1)[0]!)
  liste.value = kopie
}

async function dragEnd() {
  if (gezogen.value === null) return
  gezogen.value = null
  const ids = liste.value.map(t => t.id)
  if (ids.join() === props.todos.map(t => t.id).join()) return
  await aktion(() => api('/api/todos/sortierung', { method: 'POST', body: { ids } }), TODO_KEYS)
}

// --- Aktionen --------------------------------------------------------------
async function erledigen(t: TodoZeile) {
  const ok = await aktion(() => api(`/api/todos/${t.id}`, { method: 'PATCH', body: { erledigt: true } }), TODO_KEYS)
  if (ok) toast.success(t.art === 'daily' ? 'Besprochen' : 'Erledigt', {
    action: { label: 'Rückgängig', onClick: () => aktion(() => api(`/api/todos/${t.id}`, { method: 'PATCH', body: { erledigt: false } }), TODO_KEYS) },
  })
}

async function nachgefasst(t: TodoZeile) {
  const neu = await aktion(() => api<{ nachfassenAm: string }>(`/api/todos/${t.id}/nachgefasst`, { method: 'POST', body: {} }), TODO_KEYS)
  if (neu) toast.success(`Nachfassen am ${format(zuDate(neu.nachfassenAm), 'EEE d.M.', { locale: de })}`)
}

// Eingabefeld nutzt denselben Parser wie die Schnelleingabe (wer: …, bis fr)
const neuText = ref('')
async function hinzufuegen() {
  const r = parseQuickInput(`${PRAEFIX[props.art]} ${neuText.value}`, { heute: heuteDatum, aufgaben: [], konten: [] })
  if (r.art !== 'todo') return
  const ok = await aktion(() => api('/api/todos', {
    method: 'POST',
    body: {
      art: r.todoArt,
      text: r.text,
      wer: r.wer ?? null,
      ...(r.todoArt === 'warten' ? { nachfassenAm: r.stichtag ?? null } : {}),
      ...(r.todoArt === 'merker' ? { faelligAm: r.stichtag ?? null } : {}),
    },
  }), TODO_KEYS)
  if (ok) neuText.value = ''
}

const dialog = ref(false)
const bearbeitet = ref<TodoZeile | null>(null)
function bearbeiten(t: TodoZeile) {
  bearbeitet.value = t
  dialog.value = true
}

function stichtagText(t: TodoZeile): string | undefined {
  const tag = stichtag(t)
  if (!tag) return undefined
  const text = tag === heuteDatum ? 'heute' : format(zuDate(tag), 'EEE d.M.', { locale: de })
  return t.art === 'warten' ? `nachfassen ${text}` : `fällig ${text}`
}
</script>

<template>
  <div class="grid gap-1">
    <p v-if="!liste.length && leerText" class="py-1 text-sm text-muted-foreground">
      {{ leerText }}
    </p>
    <div
      v-for="t in liste"
      :key="t.id"
      class="group flex items-start gap-2 rounded-md px-1 py-1.5 text-sm"
      :class="[
        istFaellig(t, heuteDatum) ? 'bg-konto-butter/10 ring-1 ring-konto-butter/40' : 'hover:bg-accent/50',
        gezogen === t.id && 'opacity-40',
      ]"
      :draggable="!kompakt || aufTimelineZiehbar"
      :title="aufTimelineZiehbar ? 'Auf die Timeline ziehen → 30 min geplant' : undefined"
      @dragstart="dragStart($event, t.id)"
      @dragover="dragOver($event, t.id)"
      @dragend="dragEnd"
      @drop.prevent
    >
      <GripVertical v-if="!kompakt || aufTimelineZiehbar" class="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
      <Checkbox
        class="mt-0.5"
        :aria-label="art === 'daily' ? 'Besprochen' : 'Erledigt'"
        :title="art === 'daily' ? 'Besprochen' : 'Erledigt'"
        @update:model-value="erledigen(t)"
      />
      <button type="button" class="min-w-0 flex-1 text-left" @click="bearbeiten(t)">
        <div class="break-words">
          <span v-if="t.wer" class="font-medium">{{ t.wer }}: </span>{{ t.text }}
        </div>
        <div class="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span v-if="art === 'warten'">{{ alterText(tageSeit(t.erstelltAm, heuteDatum)) }}</span>
          <span v-if="stichtagText(t)" :class="{ 'font-medium text-konto-butter': istFaellig(t, heuteDatum) }">{{ stichtagText(t) }}</span>
          <span v-if="t.aufgabeTitel || t.kontoName" class="inline-flex items-center gap-1">
            <span class="size-2 rounded-full" :class="kontoFarbKlassen(t.kontoFarbe).punkt" />
            {{ t.aufgabeTitel ?? t.kontoName }}
          </span>
        </div>
      </button>
      <Button
        v-if="art === 'warten'"
        size="icon"
        variant="ghost"
        class="size-7 shrink-0"
        :aria-label="`Nachgefasst (+${NACHFASSEN_ARBEITSTAGE} Arbeitstage)`"
        :title="`Nachgefasst (+${NACHFASSEN_ARBEITSTAGE} Arbeitstage)`"
        @click="nachgefasst(t)"
      >
        <AlarmClockCheck />
      </Button>
    </div>

    <form v-if="!kompakt" class="mt-1 flex items-center gap-2" @submit.prevent="hinzufuegen">
      <Plus class="size-4 shrink-0 text-muted-foreground" />
      <Input v-model="neuText" :placeholder="PLATZHALTER[art]" class="h-8 border-transparent bg-transparent shadow-none focus-visible:border-input" />
    </form>

    <TodoDialog v-model:open="dialog" :todo="bearbeitet" />
  </div>
</template>
