<script setup lang="ts">
import { format } from 'date-fns'
import { refDebounced } from '@vueuse/core'
import { Pin, Plus, Search } from '@lucide/vue'
import NotizEditor from '~/components/notizen/NotizEditor.vue'

useHead({ title: 'Notizen · Daybreak' })

const route = useRoute()
const router = useRouter()
const gewaehlteId = computed(() => Number(route.query.id) || undefined)

// Suche + Tag-Filter (Plan §3.7: LIKE über Titel und Inhalt)
const suche = ref('')
const sucheVerzoegert = refDebounced(suche, 250)
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : undefined))

const { data: notizen } = useFetch('/api/notizen', {
  key: 'notizen-liste',
  query: { q: sucheVerzoegert, tag },
  default: () => [],
})
const { data: tags } = useFetch('/api/notizen/tags', { key: 'notizen-tags', default: () => [] })

function tagUmschalten(t: string) {
  router.replace({ query: { ...route.query, tag: tag.value === t ? undefined : t } })
}

function datumText(iso: string) {
  const d = new Date(iso)
  return zuDatum(d) === heute() ? format(d, 'HH:mm') : format(d, 'dd.MM.yy')
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
    <aside class="grid content-start gap-3">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="suche" placeholder="Suchen …" class="pl-8" aria-label="Notizen durchsuchen" />
        </div>
        <Button size="icon" aria-label="Neue Notiz" title="Neue Notiz (oder „n Titel“ in Strg+K)" @click="neueNotiz()">
          <Plus />
        </Button>
      </div>

      <div v-if="tags.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="t in tags"
          :key="t.tag"
          type="button"
          class="rounded-full border px-2 py-0.5 text-xs transition"
          :class="tag === t.tag ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'"
          @click="tagUmschalten(t.tag)"
        >
          #{{ t.tag }} <span class="opacity-70">{{ t.anzahl }}</span>
        </button>
      </div>

      <div class="grid gap-1">
        <p v-if="!notizen.length" class="py-4 text-center text-sm text-muted-foreground">
          {{ suche || tag ? 'Keine Treffer.' : 'Noch keine Notizen.' }}
        </p>
        <NuxtLink
          v-for="n in notizen"
          :key="n.id"
          :to="{ query: { ...route.query, id: n.id } }"
          class="grid gap-0.5 rounded-md px-2 py-2 text-sm hover:bg-accent"
          :class="{ 'bg-accent': n.id === gewaehlteId }"
        >
          <div class="flex items-center gap-1.5">
            <Pin v-if="n.angepinnt" class="size-3.5 shrink-0 text-primary" />
            <span class="flex-1 truncate font-medium">{{ n.titel }}</span>
            <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{{ datumText(n.geaendertAm) }}</span>
          </div>
          <p v-if="n.ausschnitt" class="line-clamp-2 text-xs text-muted-foreground">
            {{ n.ausschnitt }}
          </p>
          <div v-if="n.tags.length || n.aufgabeTitel || n.kontoName" class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span v-if="n.aufgabeTitel || n.kontoName" class="inline-flex items-center gap-1">
              <span class="size-2 rounded-full" :class="kontoFarbKlassen(n.kontoFarbe).punkt" />
              {{ n.aufgabeTitel ?? n.kontoName }}
            </span>
            <span v-for="t in n.tags" :key="t">#{{ t }}</span>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <section class="min-w-0">
      <NotizEditor v-if="gewaehlteId" :id="gewaehlteId" />
      <div v-else class="grid place-items-center gap-3 py-24 text-center text-muted-foreground">
        <p>Notiz links auswählen oder neu anlegen.</p>
        <Button variant="secondary" @click="neueNotiz()">
          <Plus /> Neue Notiz
        </Button>
      </div>
    </section>
  </div>
</template>
