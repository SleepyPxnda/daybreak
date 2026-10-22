<script setup lang="ts">
import { format } from 'date-fns'
import { refDebounced } from '@vueuse/core'
import { Pin, Plus, Search } from '@lucide/vue'
import NotizEditor from '~/components/notizen/NotizEditor.vue'

useHead({ title: 'Notizen · daybreak' })

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
  <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-0">
    <aside class="grid grid-cols-1 content-start gap-3 lg:-my-8 lg:border-r lg:py-6 lg:pr-4">
      <div class="flex gap-2">
        <label class="flex h-9 flex-1 items-center gap-2 rounded-md border border-line-strong bg-raised px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Search class="size-4 shrink-0" />
          <input
            v-model="suche"
            placeholder="Notizen durchsuchen"
            aria-label="Notizen durchsuchen"
            class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          >
        </label>
        <Button size="icon" aria-label="Neue Notiz" title="Neue Notiz (oder „n Titel“ in Strg+K)" @click="neueNotiz()">
          <Plus />
        </Button>
      </div>

      <div v-if="tags.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="t in tags"
          :key="t.tag"
          type="button"
          class="inline-flex h-[26px] items-center gap-1 rounded-full border px-2.5 text-xs transition-colors"
          :class="tag === t.tag ? 'border-transparent bg-primary/12 text-primary' : 'bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="tag === t.tag"
          @click="tagUmschalten(t.tag)"
        >
          #{{ t.tag }} <span class="font-mono">{{ t.anzahl }}</span>
        </button>
      </div>

      <div class="-mx-1 grid grid-cols-1 gap-0.5">
        <p v-if="!notizen.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ suche || tag ? 'Keine Treffer – hier ist alles nebelfrei.' : 'Noch keine Notizen – das Papier ist noch weiß.' }}
        </p>
        <NuxtLink
          v-for="n in notizen"
          :key="n.id"
          :to="{ query: { ...route.query, id: n.id } }"
          class="grid gap-1 rounded-md p-3"
          :class="n.id === gewaehlteId ? 'bg-muted' : 'hover:bg-raised'"
          :aria-current="n.id === gewaehlteId ? 'page' : undefined"
        >
          <div class="flex items-center gap-1.5 text-sm font-semibold">
            <Pin v-if="n.angepinnt" class="size-3.5 shrink-0 text-primary" aria-label="Angepinnt" />
            <span class="flex-1 truncate">{{ n.titel }}</span>
            <span class="shrink-0 font-mono text-[11px] font-normal text-muted-foreground">{{ datumText(n.geaendertAm) }}</span>
          </div>
          <p v-if="n.ausschnitt" class="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">
            {{ n.ausschnitt }}
          </p>
          <div v-if="n.tags.length || n.aufgabeTitel || n.kontoName" class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span v-if="n.aufgabeTitel || n.kontoName" class="inline-flex min-w-0 items-center gap-1.5">
              <span class="size-2 shrink-0 rounded-full" :class="kontoFarbKlassen(n.kontoFarbe).punkt" />
              <span class="truncate">{{ n.aufgabeTitel ?? n.kontoName }}</span>
            </span>
            <span v-if="(n.aufgabeTitel || n.kontoName) && n.tags.length" aria-hidden="true">·</span>
            <span v-for="t in n.tags" :key="t">#{{ t }}</span>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <section class="min-w-0 lg:pl-8">
      <NotizEditor v-if="gewaehlteId" :id="gewaehlteId" />
      <div v-else class="grid place-items-center gap-3 py-24 text-center text-sm text-muted-foreground">
        <p>Klarer Himmel – wähle links eine Notiz oder fang eine neue an.</p>
        <Button variant="outline" @click="neueNotiz()">
          <Plus /> Neue Notiz
        </Button>
      </div>
    </section>
  </div>
</template>
