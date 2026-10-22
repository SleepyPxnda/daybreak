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
    <Label for="schnelleingabe" class="text-[13px] font-normal text-muted-foreground">Schnelleingabe</Label>
    <div class="flex flex-wrap gap-2">
      <div class="relative flex-[1_1_480px]">
        <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-primary">›</span>
        <Input
          id="schnelleingabe"
          v-model="text"
          placeholder="2h PROJ-123 Review · 9:00-10:30 mtg · p 30m · t Merker · w Tim: PR-Review bis fr"
          class="h-11 rounded-md border-line-strong pr-12 pl-7 font-mono text-sm"
          :disabled="laeuft"
          @keydown.enter.prevent="enter"
          @keydown.esc="text = ''"
        />
        <kbd class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center rounded-sm border px-1.5 text-muted-foreground">
          <CornerDownLeft class="size-3" />
        </kbd>
      </div>
      <!-- Aktionen neben dem Feld (z. B. „Wie gestern“, „Tagesabschluss“) -->
      <slot />
    </div>

    <div v-if="ergebnis.art !== 'leer'" class="min-h-6 text-[13px]">
      <p v-if="ergebnis.art === 'fehler'" class="text-destructive">
        {{ ergebnis.meldung }}
      </p>
      <p v-else-if="ergebnis.art === 'suche'" class="text-muted-foreground">
        Dauer oder Präfix voranstellen, z. B. „1h {{ ergebnis.text }}“ oder „t {{ ergebnis.text }}“ – suchen mit Strg+K
      </p>
      <template v-else-if="vorschau">
        <p class="wrap-anywhere">
          {{ vorschau.text }}
          <span v-if="vorschau.notiz" class="text-muted-foreground">· „{{ vorschau.notiz }}“</span>
        </p>
        <div v-if="ergebnis.art === 'block' && ergebnis.kandidaten" class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">Mehrere Treffer:</span>
          <Button v-for="(k, i) in ergebnis.kandidaten" :key="i" size="sm" variant="outline" class="max-w-full" :title="zielText(k)" @click="ausfuehren(k)">
            <span class="truncate">{{ zielText(k) }}</span>
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
