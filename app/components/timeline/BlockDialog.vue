<script setup lang="ts">
import type { BlockKind, BlockStatus } from '#shared/utils/bloecke'
import type { TimelineBlock } from '~/utils/timeline'

export interface BlockEntwurf {
  datum: string
  start: number
  ende: number
  status: BlockStatus
  kind?: BlockKind
  aufgabeId?: number | null
  kontoId?: number | null
  notiz?: string | null
}

const props = defineProps<{
  /** Bestehender Block (bearbeiten) … */
  block?: TimelineBlock | null
  /** … oder Entwurf (anlegen) */
  entwurf?: BlockEntwurf | null
}>()
const offen = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ gespeichert: [] }>()

const pause = ref(false)
const ziel = ref('')
const start = ref(0)
const ende = ref(0)
const gebucht = ref(true)
const notiz = ref('')

watch(offen, (jetztOffen) => {
  if (!jetztOffen) return
  const quelle = props.block ?? props.entwurf
  if (!quelle) return
  pause.value = quelle.kind === 'pause'
  ziel.value = zielWert(quelle)
  start.value = quelle.start
  ende.value = quelle.ende
  gebucht.value = quelle.status === 'gebucht'
  notiz.value = quelle.notiz ?? ''
})

const gueltig = computed(() => start.value < ende.value && (pause.value || !!ziel.value))

async function speichern() {
  const body = {
    kind: pause.value ? 'pause' : 'arbeit',
    status: gebucht.value ? 'gebucht' : 'geplant',
    start: start.value,
    ende: ende.value,
    ...(pause.value ? { aufgabeId: null, kontoId: null } : zielAusWert(ziel.value)),
    notiz: notiz.value || null,
  }
  const ok = await aktion(
    () => props.block
      ? api(`/api/blocks/${props.block.id}`, { method: 'PATCH', body })
      : api('/api/blocks', { method: 'POST', body: { ...body, datum: props.entwurf!.datum } }),
    TAG_KEYS,
  )
  if (ok) {
    offen.value = false
    emit('gespeichert')
  }
}

async function loeschen() {
  if (!props.block) return
  const ok = await aktion(() => api(`/api/blocks/${props.block!.id}`, { method: 'DELETE' }), TAG_KEYS)
  if (ok) offen.value = false
}
</script>

<template>
  <Dialog v-model:open="offen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ block ? 'Block bearbeiten' : 'Neuer Block' }}</DialogTitle>
        <DialogDescription v-if="block?.vorlageId">
          Termin aus einem wiederkehrenden Block.
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="speichern">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <Switch id="block-pause" v-model="pause" />
            <Label for="block-pause">Pause</Label>
          </div>
          <div class="flex items-center gap-2">
            <Switch id="block-gebucht" v-model="gebucht" />
            <Label for="block-gebucht">{{ gebucht ? 'Gebucht' : 'Geplant' }}</Label>
          </div>
        </div>
        <div v-if="!pause" class="grid gap-2">
          <Label>Aufgabe / Konto</Label>
          <ZielAuswahl v-model="ziel" />
        </div>
        <div class="flex gap-3">
          <div class="grid gap-2">
            <Label>Von</Label>
            <UhrzeitInput v-model="start" />
          </div>
          <div class="grid gap-2">
            <Label>Bis</Label>
            <UhrzeitInput v-model="ende" />
          </div>
          <div class="grid gap-2">
            <Label>Dauer</Label>
            <div class="flex h-9 items-center tabular-nums text-muted-foreground">
              {{ start < ende ? formatDauer(ende - start) : '–' }}
            </div>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="block-notiz">Notiz</Label>
          <Textarea id="block-notiz" v-model="notiz" rows="2" />
        </div>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button v-if="block" type="button" variant="ghost" @click="loeschen">
            Löschen
          </Button>
          <Button type="submit" :disabled="!gueltig">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
