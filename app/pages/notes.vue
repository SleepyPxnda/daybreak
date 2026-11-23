<script setup lang="ts">
import { format } from 'date-fns'
import { refDebounced } from '@vueuse/core'
import { ArrowLeft, Pin, Plus, Search } from '@lucide/vue'
import { NOTE_KINDS } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'
import NoteEditor from '~/components/notes/NoteEditor.vue'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

useHead({ title: 'Notizen · daybreak' })

const route = useRoute()
const router = useRouter()
const selectedId = computed(() => Number(route.query.id) || undefined)

// Search + tag filter (LIKE over title and content)
const search = ref('')
const searchDebounced = refDebounced(search, 250)
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : undefined))
const kind = computed(() => NOTE_KINDS.find(entry => entry.kind === route.query.kind)?.kind)
/** Filters kept when creating or deleting a note and when going back to the list */
const listQuery = computed(() => ({ tag: tag.value, kind: kind.value }))

const { data: notes } = useFetch('/api/notes', {
  key: 'notes-list',
  query: { q: searchDebounced, tag, kind },
  default: () => [],
})
const { data: tags } = useFetch('/api/notes/tags', { key: 'notes-tags', default: () => [] })

function toggleTag(t: string) {
  router.replace({ query: { ...route.query, tag: tag.value === t ? undefined : t } })
}

function selectKind(next: NoteKind | undefined) {
  router.replace({ query: { ...route.query, kind: next } })
}

function dateText(iso: string) {
  const d = new Date(iso)
  return toIsoDate(d) === today() ? format(d, 'HH:mm') : format(d, 'dd.MM.yy')
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-0">
    <aside :class="selectedId ? 'hidden' : 'grid'" class="grid-cols-1 content-start gap-3 lg:grid lg:-my-8 lg:border-r lg:py-6 lg:pr-4">
      <div class="flex gap-2">
        <label class="flex h-9 flex-1 items-center gap-2 rounded-md border border-line-strong bg-raised px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Search class="size-4 shrink-0" />
          <input
            v-model="search"
            placeholder="Notizen durchsuchen"
            aria-label="Notizen durchsuchen"
            class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          >
        </label>
        <Button size="icon" aria-label="Neue Notiz" title="Neue Notiz (oder „n Titel“ in Strg+K)" @click="newNote('Neue Notiz', { kind }, listQuery)">
          <Plus />
        </Button>
      </div>

      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Art filtern">
        <button
          type="button"
          class="inline-flex h-[26px] items-center rounded-full border px-2.5 text-xs transition-colors"
          :class="!kind ? 'border-transparent bg-primary/12 text-primary' : 'bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="!kind"
          @click="selectKind(undefined)"
        >
          Alle
        </button>
        <button
          v-for="entry in NOTE_KINDS"
          :key="entry.kind"
          type="button"
          class="inline-flex h-[26px] items-center gap-1 rounded-full border px-2.5 text-xs transition-colors"
          :class="kind === entry.kind ? ['border-transparent', noteKindLook(entry.kind).surface, noteKindLook(entry.kind).text] : 'bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="kind === entry.kind"
          @click="selectKind(entry.kind)"
        >
          <component :is="noteKindLook(entry.kind).icon" class="size-3" aria-hidden="true" />
          {{ entry.title }}
        </button>
      </div>

      <div v-if="tags.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="t in tags"
          :key="t.tag"
          type="button"
          class="inline-flex h-[26px] items-center gap-1 rounded-full border px-2.5 text-xs transition-colors"
          :class="tag === t.tag ? 'border-transparent bg-primary/12 text-primary' : 'bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="tag === t.tag"
          @click="toggleTag(t.tag)"
        >
          #{{ t.tag }} <span class="font-mono">{{ t.count }}</span>
        </button>
      </div>

      <div class="-mx-1 grid grid-cols-1 gap-0.5">
        <p v-if="!notes.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ search || tag || kind ? 'Keine Treffer – hier ist alles nebelfrei.' : 'Noch keine Notizen – das Papier ist noch weiß.' }}
        </p>
        <NuxtLink
          v-for="n in notes"
          :key="n.id"
          :to="{ query: { ...route.query, id: n.id } }"
          class="grid gap-1 rounded-md p-3"
          :class="n.id === selectedId ? 'bg-muted' : 'hover:bg-raised'"
          :aria-current="n.id === selectedId ? 'page' : undefined"
        >
          <div class="flex items-center gap-1.5 text-sm font-semibold">
            <Pin v-if="n.pinned" class="size-3.5 shrink-0 text-primary" aria-label="Angepinnt" />
            <span class="flex-1 truncate">{{ n.title }}</span>
            <NoteKindMarker v-if="n.kind" :kind="n.kind" />
            <span class="shrink-0 font-mono text-[11px] font-normal text-muted-foreground">{{ dateText(n.updatedAt) }}</span>
          </div>
          <p v-if="n.excerpt" class="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">
            {{ n.excerpt }}
          </p>
          <div v-if="n.tags.length || n.taskTitle || n.accountName" class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span v-if="n.taskTitle || n.accountName" class="inline-flex min-w-0 items-center gap-1.5">
              <TaskKey v-if="n.taskKey" :value="n.taskKey" :color="n.accountColor" />
              <span v-else class="size-2 shrink-0 rounded-full" :class="accountColorClasses(n.accountColor).dot" />
              <span class="truncate">{{ n.taskTitle ?? n.accountName }}</span>
            </span>
            <span v-if="(n.taskTitle || n.accountName) && n.tags.length" aria-hidden="true">·</span>
            <span v-for="t in n.tags" :key="t">#{{ t }}</span>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <section class="min-w-0 lg:pl-8" :class="selectedId ? 'block' : 'hidden lg:block'">
      <NuxtLink
        v-if="selectedId"
        :to="{ path: '/notes', query: listQuery }"
        class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft class="size-4" /> Zurück zur Liste
      </NuxtLink>
      <NoteEditor v-if="selectedId" :id="selectedId" />
      <div v-else class="grid place-items-center gap-3 py-24 text-center text-sm text-muted-foreground">
        <p>Klarer Himmel – wähle links eine Notiz oder fang eine neue an.</p>
        <Button variant="outline" @click="newNote('Neue Notiz', { kind }, listQuery)">
          <Plus /> Neue Notiz
        </Button>
      </div>
    </section>
  </div>
</template>
