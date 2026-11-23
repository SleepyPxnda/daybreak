<script setup lang="ts">
import { format } from 'date-fns'
import { refDebounced, useResizeObserver } from '@vueuse/core'
import { ArrowLeft, Plus, Search, X } from '@lucide/vue'
import { groupNotesForList, NOTE_KINDS } from '#shared/utils/notes'
import type { NoteKind } from '#shared/utils/notes'
import NoteEditor from '~/components/notes/NoteEditor.vue'
import NoteKindMarker from '~/components/notes/NoteKindMarker.vue'

useHead({ title: 'Notizen · daybreak' })

const route = useRoute()
const router = useRouter()
const todayDate = useToday()
const selectedId = computed(() => Number(route.query.id) || undefined)

// Search + filters (LIKE over title and content)
const search = ref('')
const searchDebounced = refDebounced(search, 250)
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : undefined))
const kind = computed(() => NOTE_KINDS.find(entry => entry.kind === route.query.kind)?.kind)
/** `?account=` as a positive int; anything else is ignored */
const accountId = computed(() => {
  const value = Number(route.query.account)
  return typeof route.query.account === 'string' && Number.isInteger(value) && value > 0 ? value : undefined
})
/** Filters kept when creating or deleting a note and when going back to the list */
const listQuery = computed(() => ({ tag: tag.value, kind: kind.value, account: accountId.value ? String(accountId.value) : undefined }))
const hasFilter = computed(() => !!(search.value || tag.value || kind.value || accountId.value))

const { data: notes } = useFetch('/api/notes', {
  key: 'notes-list',
  query: { q: searchDebounced, tag, kind, accountId },
  default: () => [],
})
const { data: tags } = useFetch('/api/notes/tags', { key: 'notes-tags', default: () => [] })
const { data: accounts } = useAccounts()

const ALL_VALUE = 'all'
const FILTER_TRIGGER_CLASS = 'data-[size=sm]:h-[26px] max-w-full gap-1 rounded-md px-2.5 text-xs'
const ACTIVE_FILTER_CLASS = 'border-transparent bg-primary/12 text-primary hover:bg-primary/12 dark:bg-primary/12 dark:hover:bg-primary/12'

const selectedKind = computed(() => NOTE_KINDS.find(entry => entry.kind === kind.value))
const chosenAccount = computed(() => accounts.value.find(entry => entry.id === accountId.value))
/** Active accounts, plus an archived one that is chosen in the URL */
const offeredAccounts = computed(() => accounts.value.filter(entry => entry.status === 'active' || entry.id === accountId.value))
const isChosenAccountArchived = computed(() => !!chosenAccount.value && chosenAccount.value.status !== 'active')

// The account name fades out only when it is really cut off, so short names are not dimmed
const accountNameElement = useTemplateRef<HTMLElement>('accountNameElement')
const isAccountNameCutOff = ref(false)
useResizeObserver(accountNameElement, () => {
  if (accountNameElement.value) isAccountNameCutOff.value = accountNameElement.value.scrollWidth > accountNameElement.value.clientWidth
})

const sections = computed(() => groupNotesForList(
  notes.value.map(entry => ({ ...entry, updatedDate: toIsoDate(new Date(entry.updatedAt)) })),
  todayDate.value,
))

function toggleTag(chosenTag: string) {
  router.replace({ query: { ...route.query, tag: tag.value === chosenTag ? undefined : chosenTag } })
}

function selectKind(next: unknown) {
  router.replace({ query: { ...route.query, kind: next === ALL_VALUE ? undefined : String(next) } })
}

function selectAccount(next: unknown) {
  router.replace({ query: { ...route.query, account: next === ALL_VALUE ? undefined : String(next) } })
}

const isTagListOpen = ref(false)
function selectTag(chosenTag: string) {
  toggleTag(chosenTag)
  isTagListOpen.value = false
}

function createNote(extra: { kind?: NoteKind }) {
  return newNote('Neue Notiz', { ...extra, accountId: accountId.value }, listQuery.value)
}

function dateText(iso: string) {
  const date = new Date(iso)
  return toIsoDate(date) === todayDate.value ? format(date, 'HH:mm') : format(date, 'dd.MM.yy')
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-0">
    <aside :class="selectedId ? 'hidden' : 'grid'" class="grid-cols-[minmax(0,1fr)] content-start gap-3 lg:grid lg:-my-8 lg:border-r lg:py-6 lg:pr-4">
      <div class="flex gap-2">
        <label class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line-strong bg-raised px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Search class="size-4 shrink-0" />
          <input
            v-model="search"
            placeholder="Notizen durchsuchen"
            aria-label="Notizen durchsuchen"
            class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          >
        </label>
        <Button size="icon" aria-label="Neue Notiz" title="Neue Notiz (oder „n Titel“ in Strg+K)" @click="createNote({ kind })">
          <Plus />
        </Button>
      </div>

      <div class="flex min-w-0 flex-wrap items-center gap-1.5">
        <Select :model-value="kind ?? ALL_VALUE" @update:model-value="selectKind">
          <SelectTrigger size="sm" :class="[FILTER_TRIGGER_CLASS, selectedKind ? ['border-transparent', noteKindLook(selectedKind.kind).surface, noteKindLook(selectedKind.kind).text] : 'bg-raised text-muted-foreground']">
            <SelectValue placeholder="Art">
              <span v-if="selectedKind" class="inline-flex items-center gap-1" :class="noteKindLook(selectedKind.kind).text">
                <component :is="noteKindLook(selectedKind.kind).icon" class="size-3" aria-hidden="true" />
                {{ selectedKind.title }}
              </span>
              <span v-else class="text-muted-foreground">Art</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem :value="ALL_VALUE">
              Alle
            </SelectItem>
            <SelectItem v-for="entry in NOTE_KINDS" :key="entry.kind" :value="entry.kind">
              <component :is="noteKindLook(entry.kind).icon" class="size-4" :class="noteKindLook(entry.kind).text" aria-hidden="true" />
              {{ entry.title }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select :model-value="chosenAccount ? String(chosenAccount.id) : ALL_VALUE" @update:model-value="selectAccount">
          <SelectTrigger
            size="sm"
            :class="[FILTER_TRIGGER_CLASS, chosenAccount ? 'max-w-[11rem]' : '', chosenAccount ? ACTIVE_FILTER_CLASS : 'bg-raised text-muted-foreground']"
            :title="chosenAccount ? (isChosenAccountArchived ? `${chosenAccount.name} (archiviert)` : chosenAccount.name) : undefined"
          >
            <SelectValue placeholder="Konto" class="min-w-0 !flex items-center gap-1.5">
              <template v-if="chosenAccount">
                <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(chosenAccount.color).dot" />
                <span ref="accountNameElement" class="min-w-0 overflow-hidden text-left whitespace-nowrap text-primary" :class="{ 'fade-end': isAccountNameCutOff }">{{ chosenAccount.name }}</span>
                <span v-if="isChosenAccountArchived" class="shrink-0 text-muted-foreground">archiviert</span>
              </template>
              <span v-else class="text-muted-foreground">Konto</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" class="max-w-[min(20rem,calc(100vw-2rem))]">
            <SelectItem :value="ALL_VALUE">
              Alle
            </SelectItem>
            <SelectItem v-for="entry in offeredAccounts" :key="entry.id" :value="String(entry.id)" :title="entry.name" class="*:[span]:last:min-w-0 *:[span]:last:gap-2">
              <span class="size-2 shrink-0 rounded-full" :class="accountColorClasses(entry.color).dot" />
              <span class="min-w-0 truncate">{{ entry.name }}</span>
              <span v-if="entry.status !== 'active'" class="shrink-0 text-xs text-muted-foreground">archiviert</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <div class="inline-flex min-w-0 items-center gap-0.5">
          <Popover v-model:open="isTagListOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="inline-flex h-[26px] min-w-0 items-center rounded-md border px-2.5 text-xs transition-colors"
                :class="tag ? 'border-transparent bg-primary/12 text-primary' : 'border-input bg-raised text-muted-foreground hover:bg-muted hover:text-foreground'"
                aria-haspopup="listbox"
              >
                <span class="max-w-[11rem] min-w-0 truncate">{{ tag ? `#${tag}` : 'Tag' }}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-64 p-0">
              <Command>
                <CommandInput placeholder="Tag suchen …" />
                <CommandList>
                  <CommandEmpty>Kein Tag gefunden.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem v-for="entry in tags" :key="entry.tag" :value="entry.tag" @select="selectTag(entry.tag)">
                      <span class="min-w-0 truncate">#{{ entry.tag }}</span>
                      <span class="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{{ entry.count }}</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <button
            v-if="tag"
            type="button"
            class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tag-Filter entfernen"
            title="Tag-Filter entfernen"
            @click="toggleTag(tag)"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>

      <div class="-mx-1 grid grid-cols-[minmax(0,1fr)] gap-0.5">
        <p v-if="!notes.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ hasFilter ? 'Keine Treffer – hier ist alles nebelfrei.' : 'Noch keine Notizen – das Papier ist noch weiß.' }}
        </p>
        <section v-for="section in sections" :key="section.key" class="grid grid-cols-[minmax(0,1fr)] gap-0.5" :aria-label="section.title">
          <h2 class="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
            {{ section.title }}
          </h2>
          <NuxtLink
            v-for="n in section.notes"
            :key="n.id"
            :to="{ query: { ...route.query, id: n.id } }"
            class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 rounded-md px-3 py-2"
            :class="n.id === selectedId ? 'bg-muted' : 'hover:bg-raised'"
            :aria-current="n.id === selectedId ? 'page' : undefined"
          >
            <div class="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <NoteKindMarker v-if="n.kind" :kind="n.kind" />
              <span v-else class="size-3.5 shrink-0" aria-hidden="true" />
              <span class="fade-end min-w-0 flex-1" :title="n.title">{{ n.title }}</span>
              <span class="shrink-0 font-mono text-[11px] font-normal text-muted-foreground">{{ dateText(n.updatedAt) }}</span>
            </div>
            <div v-if="n.taskTitle || n.accountName || n.excerpt" class="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] text-muted-foreground">
              <TaskKey v-if="n.taskKey" :value="n.taskKey" :color="n.accountColor" />
              <span v-else-if="n.taskTitle || n.accountName" class="size-2 shrink-0 rounded-full" :class="accountColorClasses(n.accountColor).dot" />
              <span v-if="n.excerpt" class="fade-end min-w-0 flex-1">{{ n.excerpt }}</span>
            </div>
          </NuxtLink>
        </section>
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
      <NoteEditor v-if="selectedId" :id="selectedId" :list-query="listQuery" />
      <div v-else class="grid place-items-center gap-3 py-24 text-center text-sm text-muted-foreground">
        <p>Klarer Himmel – wähle links eine Notiz oder fang eine neue an.</p>
        <Button variant="outline" @click="createNote({ kind })">
          <Plus /> Neue Notiz
        </Button>
      </div>
    </section>
  </div>
</template>
