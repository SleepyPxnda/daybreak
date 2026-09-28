<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { CornerDownLeft } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { QiBlock, QiZiel } from '#shared/utils/quickInput'
import { parseQuickInput } from '#shared/utils/quickInput'

// Schnelleingabe (Plan §3.8) – Phase 1: Zeit buchen/planen, Pausen
const props = defineProps<{ datum: string }>()

const text = ref('')
const { data: konten } = useKonten()
const { data: aufgaben } = useAlleAufgaben()

const ergebnis = computed(() => parseQuickInput(text.value, {
  heute: heute(),
  standardDatum: props.datum,
  aufgaben: aufgaben.value,
  konten: konten.value,
}))

const kontoName = (id: number) => konten.value.find(k => k.id === id)?.name ?? '?'

function zielText(z: QiZiel): string {
  if (z.typ === 'konto') return kontoName(z.kontoId)
  if (z.typ === 'neueAufgabe') return `neue Aufgabe „${z.titel}“ in ${kontoName(z.kontoId)}`
  const a = aufgaben.value.find(x => x.id === z.aufgabeId)
  return a ? `${a.key ? `${a.key} ` : ''}${a.titel} (${kontoName(a.kontoId)})` : '?'
}

function zeitText(b: QiBlock): string {
  return 'dauer' in b.zeit ? formatDauer(b.zeit.dauer) : `${formatUhrzeit(b.zeit.start)}–${formatUhrzeit(b.zeit.ende)}`
}

function tagText(datum: string): string {
  if (datum === heute()) return 'heute'
  if (datum === plusTage(heute(), 1)) return 'morgen'
  if (datum === plusTage(heute(), -1)) return 'gestern'
  return format(zuDate(datum), 'EEE d. MMM', { locale: de })
}

const vorschau = computed(() => {
  const r = ergebnis.value
  if (r.art !== 'block') return null
  const teile = [
    r.status === 'geplant' ? 'Planen' : 'Buchen',
    tagText(r.datum),
    zeitText(r),
    r.kind === 'pause' ? 'Pause' : r.ziel ? zielText(r.ziel) : undefined,
  ].filter(Boolean)
  return { text: teile.join(' · '), notiz: r.notiz }
})

const laeuft = ref(false)

async function ausfuehren(gewaehlt?: QiZiel) {
  const r = ergebnis.value
  if (r.art === 'leer') return
  if (r.art === 'fehler') return void toast.error(r.meldung)
  if (r.art === 'suche') return void toast.info('Keine Dauer erkannt – die Suche kommt mit der Befehlspalette (Phase 2).')

  const ziel = gewaehlt ?? r.ziel
  if (r.kind === 'arbeit' && !ziel) return // Kandidaten werden angezeigt

  laeuft.value = true
  try {
    let ids: { aufgabeId: number | null, kontoId: number | null } = { aufgabeId: null, kontoId: null }
    if (ziel?.typ === 'neueAufgabe') {
      const neu = await aktion(() => api<{ id: number }>('/api/aufgaben', { method: 'POST', body: { kontoId: ziel.kontoId, titel: ziel.titel } }))
      if (!neu) return
      ids = { aufgabeId: neu.id, kontoId: null }
    }
    else if (ziel?.typ === 'aufgabe') ids = { aufgabeId: ziel.aufgabeId, kontoId: null }
    else if (ziel?.typ === 'konto') ids = { aufgabeId: null, kontoId: ziel.kontoId }

    const ok = await aktion(() => api('/api/blocks', {
      method: 'POST',
      body: { datum: r.datum, kind: r.kind, status: r.status, ...r.zeit, ...ids, notiz: r.notiz ?? null },
    }), TAG_KEYS)
    if (ok) text.value = ''
  }
  finally {
    laeuft.value = false
  }
}

const eingabe = useTemplateRef<{ $el: HTMLInputElement }>('eingabe')
defineExpose({ fokus: () => eingabe.value?.$el.focus() })
</script>

<template>
  <div class="grid gap-2">
    <div class="relative">
      <Input
        ref="eingabe"
        v-model="text"
        placeholder="2h PROJ-123 Review · 9:00-10:30 mtg · p 30m · plan 5h login morgen"
        class="pr-10 font-mono text-sm"
        :disabled="laeuft"
        @keydown.enter.prevent="ausfuehren()"
        @keydown.esc="text = ''"
      />
      <CornerDownLeft class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>

    <div v-if="ergebnis.art !== 'leer'" class="min-h-6 text-sm">
      <p v-if="ergebnis.art === 'fehler'" class="text-destructive">
        {{ ergebnis.meldung }}
      </p>
      <p v-else-if="ergebnis.art === 'suche'" class="text-muted-foreground">
        Dauer oder Uhrzeit voranstellen, z. B. „1h {{ ergebnis.text }}“
      </p>
      <template v-else-if="vorschau">
        <p>
          {{ vorschau.text }}
          <span v-if="vorschau.notiz" class="text-muted-foreground">· „{{ vorschau.notiz }}“</span>
        </p>
        <div v-if="ergebnis.kandidaten" class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">Mehrere Treffer:</span>
          <Button v-for="(k, i) in ergebnis.kandidaten" :key="i" size="sm" variant="secondary" @click="ausfuehren(k)">
            {{ zielText(k) }}
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
