<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { AlarmClock, ChevronRight, Trash2 } from '@lucide/vue'
import { istFaellig, TODO_ARTEN } from '#shared/utils/todos'
import TodoListe from '~/components/todos/TodoListe.vue'

useHead({ title: 'Merker & Daily · daybreak' })

const { nachArt } = useOffeneTodos()
const listen = TODO_ARTEN.map(a => ({ ...a, todos: nachArt(a.art) }))
const warten = nachArt('warten')
const faelligWarten = computed(() => warten.value.filter(t => istFaellig(t, heute())).length)

const LEER: Record<string, string> = {
  merker: 'Nichts im Kopf behalten – schön.',
  warten: 'Du wartest auf niemanden.',
  daily: 'Nichts fürs nächste Daily.',
}

// Archiv „besprochen/erledigt“ – erst beim Aufklappen laden
const archivOffen = ref(false)
const { data: erledigte, execute: archivLaden } = useFetch('/api/todos', {
  key: 'todos-erledigt',
  query: { status: 'erledigt' },
  default: () => [],
  immediate: false,
})
watch(archivOffen, (jetztOffen) => {
  if (jetztOffen) archivLaden()
})

const artTitel = (art: string) => TODO_ARTEN.find(a => a.art === art)?.einzahl ?? art

async function wiederOeffnen(id: number) {
  await aktion(() => api(`/api/todos/${id}`, { method: 'PATCH', body: { erledigt: false } }), TODO_KEYS)
}

async function loeschen(id: number) {
  await aktion(() => api(`/api/todos/${id}`, { method: 'DELETE' }), TODO_KEYS)
}
</script>

<template>
  <div class="grid gap-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Merker & Daily
      </h1>
      <p class="text-sm text-muted-foreground">
        Was du im Kopf behalten, von anderen brauchst oder im Daily ansprechen willst.
      </p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-6">
      <Card v-for="l in listen" :key="l.art" class="gap-0 py-0">
        <CardHeader>
          <CardTitle class="flex items-center justify-between gap-2">
            {{ l.titel }}
            <span
              v-if="l.art === 'warten' && faelligWarten"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-warnung"
            >
              <AlarmClock class="size-3" />
              <span class="tabular-nums">{{ faelligWarten }}</span> nachfassen
            </span>
            <span v-else class="font-mono text-xs font-normal text-muted-foreground">{{ l.todos.value.length }}</span>
          </CardTitle>
        </CardHeader>
        <TodoListe :art="l.art" :todos="l.todos.value" :leer-text="LEER[l.art]" />
      </Card>
    </div>

    <Card class="gap-0 py-0">
      <CardHeader :class="{ 'border-b-0': !archivOffen }" class="p-0">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-sm font-semibold"
          :aria-expanded="archivOffen"
          @click="archivOffen = !archivOffen"
        >
          <span class="inline-flex items-center gap-2">
            <ChevronRight class="size-3.5 text-muted-foreground transition-transform" :class="{ 'rotate-90': archivOffen }" />
            Besprochen / erledigt
          </span>
          <span v-if="archivOffen" class="font-mono text-xs font-normal text-muted-foreground">{{ erledigte.length }}</span>
        </button>
      </CardHeader>
      <template v-if="archivOffen">
        <p v-if="!erledigte.length" class="px-4 py-3 text-sm text-muted-foreground">
          Noch nichts erledigt.
        </p>
        <div
          v-for="t in erledigte"
          :key="t.id"
          class="flex min-h-11 items-center gap-2.5 border-b px-4 py-1.5 text-sm last:border-b-0"
        >
          <span class="inline-flex h-[22px] w-24 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {{ artTitel(t.art) }}
          </span>
          <span class="min-w-0 flex-1 truncate text-muted-foreground line-through">
            <template v-if="t.wer">{{ t.wer }}: </template>{{ t.text }}
          </span>
          <span class="font-mono text-[13px] text-muted-foreground">{{ t.erledigtAm ? format(new Date(t.erledigtAm), 'd.M.yyyy', { locale: de }) : '' }}</span>
          <Button variant="ghost" size="sm" class="h-7 text-xs" title="Wieder öffnen" @click="wiederOeffnen(t.id)">
            Wiederherstellen
          </Button>
          <Button size="icon" variant="ghost" class="size-7" aria-label="Löschen" title="Löschen" @click="loeschen(t.id)">
            <Trash2 />
          </Button>
        </div>
      </template>
    </Card>
  </div>
</template>
