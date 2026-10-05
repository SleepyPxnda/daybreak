<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight, RotateCcw, Trash2 } from '@lucide/vue'
import { TODO_ARTEN } from '#shared/utils/todos'
import TodoListe from '~/components/todos/TodoListe.vue'

useHead({ title: 'Merker & Daily · Daybreak' })

const { nachArt } = useOffeneTodos()
const listen = TODO_ARTEN.map(a => ({ ...a, todos: nachArt(a.art) }))

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
    <h1 class="text-2xl">
      Merker & Daily
    </h1>

    <div class="grid gap-4 lg:grid-cols-3">
      <Card v-for="l in listen" :key="l.art">
        <CardHeader>
          <CardTitle class="flex items-baseline justify-between">
            {{ l.titel }}
            <span class="text-sm font-normal text-muted-foreground tabular-nums">{{ l.todos.value.length }}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TodoListe :art="l.art" :todos="l.todos.value" :leer-text="LEER[l.art]" />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-2">
      <Button variant="ghost" size="sm" class="w-fit text-muted-foreground" @click="archivOffen = !archivOffen">
        <ChevronRight class="transition-transform" :class="{ 'rotate-90': archivOffen }" />
        Besprochen / erledigt
      </Button>
      <Card v-if="archivOffen">
        <CardContent class="grid gap-1">
          <p v-if="!erledigte.length" class="text-sm text-muted-foreground">
            Noch nichts erledigt.
          </p>
          <div v-for="t in erledigte" :key="t.id" class="flex items-center gap-3 rounded-md px-1 py-1 text-sm text-muted-foreground">
            <Badge variant="outline" class="w-24 justify-center">
              {{ artTitel(t.art) }}
            </Badge>
            <span class="min-w-0 flex-1 truncate">
              <template v-if="t.wer">{{ t.wer }}: </template>{{ t.text }}
            </span>
            <span class="tabular-nums">{{ t.erledigtAm ? format(new Date(t.erledigtAm), 'd.M.yyyy', { locale: de }) : '' }}</span>
            <Button size="icon" variant="ghost" class="size-7" aria-label="Wieder öffnen" title="Wieder öffnen" @click="wiederOeffnen(t.id)">
              <RotateCcw />
            </Button>
            <Button size="icon" variant="ghost" class="size-7" aria-label="Löschen" title="Löschen" @click="loeschen(t.id)">
              <Trash2 />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
