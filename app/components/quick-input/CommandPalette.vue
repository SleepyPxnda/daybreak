<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { ListboxFilter } from 'reka-ui'
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CornerDownLeft,
  FolderKanban,
  Hourglass,
  ListTodo,
  MessageSquare,
  NotebookPen,
  Search,
  Settings,
  StickyNote,
  Sunrise,
} from '@lucide/vue'
import type { TodoArt } from '#shared/utils/todos'

// Globale Befehlspalette (Plan §3.8): Strg/⌘ + K von jeder Seite – Schnelleingabe, Suche, Navigation.
// Filtert selbst (ListboxFilter statt CommandInput), damit Aktions- und Suchtreffer nicht wegfiltert werden.

const offen = usePaletteOffen()
const route = useRoute()

/** Auf „Heute“ gilt der angezeigte Tag, sonst heute */
const datum = computed(() => {
  const d = String(route.query.datum ?? '')
  return route.path === '/' && istDatum(d) ? d : heute()
})

const { text, ergebnis, vorschau, zielText, laeuft, ausfuehren } = useSchnelleingabe(datum)

useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    offen.value = !offen.value
  }
})

watch(offen, (jetztOffen) => {
  if (!jetztOffen) text.value = ''
})

// --- Suche ----------------------------------------------------------------
interface SuchErgebnis {
  aufgaben: { id: number, key: string | null, titel: string, status: string, kontoFarbe: string }[]
  konten: { id: number, name: string, farbe: string, status: string }[]
  todos: { id: number, art: TodoArt, text: string, wer: string | null }[]
}
const treffer = ref<SuchErgebnis | null>(null)
const suchtext = computed(() => (ergebnis.value.art === 'suche' ? ergebnis.value.text : ''))

const suchen = useDebounceFn(async (q: string) => {
  if (q.length < 2) {
    treffer.value = null
    return
  }
  try {
    const antwort = await api<SuchErgebnis>('/api/suche', { query: { q } })
    if (q === suchtext.value) treffer.value = antwort
  }
  catch {
    treffer.value = null
  }
}, 150)
watch(suchtext, q => suchen(q))

// --- Navigation -----------------------------------------------------------
const SEITEN = [
  { titel: 'Heute', to: '/', icon: Sunrise },
  { titel: 'Woche', to: '/woche', icon: CalendarRange },
  { titel: 'Übersicht', to: '/uebersicht', icon: BarChart3 },
  { titel: 'Kalender', to: '/kalender', icon: CalendarDays },
  { titel: 'Merker & Daily', to: '/todos', icon: ListTodo },
  { titel: 'Notizen', to: '/notizen', icon: NotebookPen },
  { titel: 'Konten & Aufgaben', to: '/konten', icon: FolderKanban },
  { titel: 'Einstellungen', to: '/einstellungen', icon: Settings },
]
const seiten = computed(() => {
  const q = text.value.trim().toLocaleLowerCase('de')
  if (!q) return SEITEN
  if (ergebnis.value.art !== 'suche') return []
  return SEITEN.filter(s => s.titel.toLocaleLowerCase('de').includes(q))
})

const TODO_ICONS: Record<TodoArt, typeof StickyNote> = { merker: StickyNote, warten: Hourglass, daily: MessageSquare }

async function oeffne(to: string) {
  offen.value = false
  await navigateTo(to)
}

async function ausfuehrenUndSchliessen(gewaehlt?: Parameters<typeof ausfuehren>[0]) {
  if (await ausfuehren(gewaehlt)) offen.value = false
}

/**
 * Enter führt eine eindeutige Aktion (Buchen/Merker …) immer direkt aus – unabhängig davon, welcher
 * Eintrag gerade hervorgehoben ist (z. B. nach Einfügen per Strg+V). Bei Kandidaten/Suche navigiert die Liste.
 */
function enterAbfangen(e: KeyboardEvent) {
  const r = ergebnis.value
  const eindeutig = r.art === 'todo' || r.art === 'fehler' || (r.art === 'block' && !r.kandidaten)
  if (!eindeutig) return
  e.preventDefault()
  e.stopPropagation()
  ausfuehrenUndSchliessen()
}
</script>

<template>
  <CommandDialog v-model:open="offen" title="Befehlspalette" description="Buchen, Merker erfassen, suchen und navigieren">
    <div class="p-1 pb-0" @keydown.enter.capture="enterAbfangen">
      <div class="flex h-9 items-center gap-2 rounded-lg bg-input/30 px-2">
        <Search class="size-4 shrink-0 opacity-50" />
        <ListboxFilter
          v-model="text"
          auto-focus
          :disabled="laeuft"
          placeholder="t Merker · d Daily-Thema · w Tim: PR-Review · 2h Aufgabe · suchen …"
          class="w-full bg-transparent font-mono text-sm outline-hidden"
        />
      </div>
    </div>

    <CommandList class="max-h-96">
      <!-- Aktion aus der Schnelleingabe -->
      <p v-if="ergebnis.art === 'fehler'" class="px-3 py-2 text-sm text-destructive">
        {{ ergebnis.meldung }}
      </p>
      <CommandGroup v-else-if="vorschau" heading="Ausführen">
        <template v-if="ergebnis.art === 'block' && ergebnis.kandidaten">
          <CommandItem
            v-for="(k, i) in ergebnis.kandidaten"
            :key="i"
            :value="`kandidat-${i}`"
            @select="ausfuehrenUndSchliessen(k)"
          >
            <CornerDownLeft /> {{ vorschau.text }} · {{ zielText(k) }}
          </CommandItem>
        </template>
        <CommandItem v-else value="ausfuehren" @select="ausfuehrenUndSchliessen()">
          <CornerDownLeft />
          <span>{{ vorschau.text }}</span>
          <span v-if="vorschau.notiz" class="text-muted-foreground">· „{{ vorschau.notiz }}“</span>
        </CommandItem>
      </CommandGroup>

      <!-- Suchtreffer -->
      <template v-if="ergebnis.art === 'suche' && treffer">
        <CommandGroup v-if="treffer.aufgaben.length" heading="Aufgaben">
          <CommandItem v-for="a in treffer.aufgaben" :key="`a${a.id}`" :value="`aufgabe-${a.id}`" @select="oeffne(`/aufgaben/${a.id}`)">
            <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(a.kontoFarbe).punkt" />
            <span v-if="a.key" class="font-mono text-xs text-muted-foreground">{{ a.key }}</span>
            <span :class="{ 'text-muted-foreground': a.status !== 'offen' }">{{ a.titel }}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup v-if="treffer.konten.length" heading="Konten">
          <CommandItem v-for="k in treffer.konten" :key="`k${k.id}`" :value="`konto-${k.id}`" @select="oeffne(`/konten?konto=${k.id}`)">
            <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
            <span :class="{ 'text-muted-foreground': k.status !== 'aktiv' }">{{ k.name }}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup v-if="treffer.todos.length" heading="Merker & Daily">
          <CommandItem v-for="t in treffer.todos" :key="`t${t.id}`" :value="`todo-${t.id}`" @select="oeffne('/todos')">
            <component :is="TODO_ICONS[t.art]" />
            <span v-if="t.wer" class="text-muted-foreground">{{ t.wer }}:</span>
            <span class="truncate">{{ t.text }}</span>
          </CommandItem>
        </CommandGroup>
        <p
          v-if="!treffer.aufgaben.length && !treffer.konten.length && !treffer.todos.length && !seiten.length"
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          Nichts gefunden.
        </p>
      </template>

      <!-- Navigation -->
      <CommandGroup v-if="seiten.length" heading="Gehe zu">
        <CommandItem v-for="s in seiten" :key="s.to" :value="`seite-${s.to}`" @select="oeffne(s.to)">
          <component :is="s.icon" /> {{ s.titel }}
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
