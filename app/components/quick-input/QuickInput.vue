<script setup lang="ts">
import { CornerDownLeft } from '@lucide/vue'
import { toast } from 'vue-sonner'

// Schnelleingabe-Zeile auf „Heute“ (Plan §3.8); Logik in useSchnelleingabe
const props = defineProps<{ datum: string }>()

const { text, ergebnis, vorschau, zielText, laeuft, ausfuehren } = useSchnelleingabe(() => props.datum)

async function enter() {
  if (ergebnis.value.art === 'suche') {
    toast.info('Suchen geht mit Strg+K')
    return
  }
  await ausfuehren()
}
</script>

<template>
  <div class="grid gap-2">
    <div class="relative">
      <Input
        v-model="text"
        placeholder="2h PROJ-123 Review · 9:00-10:30 mtg · p 30m · t Merker · w Tim: PR-Review bis fr"
        class="pr-10 font-mono text-sm"
        :disabled="laeuft"
        @keydown.enter.prevent="enter"
        @keydown.esc="text = ''"
      />
      <CornerDownLeft class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>

    <div v-if="ergebnis.art !== 'leer'" class="min-h-6 text-sm">
      <p v-if="ergebnis.art === 'fehler'" class="text-destructive">
        {{ ergebnis.meldung }}
      </p>
      <p v-else-if="ergebnis.art === 'suche'" class="text-muted-foreground">
        Dauer oder Präfix voranstellen, z. B. „1h {{ ergebnis.text }}“ oder „t {{ ergebnis.text }}“ – suchen mit Strg+K
      </p>
      <template v-else-if="vorschau">
        <p>
          {{ vorschau.text }}
          <span v-if="vorschau.notiz" class="text-muted-foreground">· „{{ vorschau.notiz }}“</span>
        </p>
        <div v-if="ergebnis.art === 'block' && ergebnis.kandidaten" class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">Mehrere Treffer:</span>
          <Button v-for="(k, i) in ergebnis.kandidaten" :key="i" size="sm" variant="secondary" @click="ausfuehren(k)">
            {{ zielText(k) }}
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
