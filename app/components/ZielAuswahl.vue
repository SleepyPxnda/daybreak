<script setup lang="ts">
// Auswahl „Aufgabe oder direkt aufs Konto“ – Wert siehe utils/ziel.ts
const wert = defineModel<string>({ default: '' })

const { data: konten } = useKonten()
const { data: aufgaben } = useAlleAufgaben()

// Abgeschlossene/archivierte nur, wenn sie gerade ausgewählt sind (Plan §3.1: nicht in Vorschlägen)
const gruppen = computed(() => konten.value
  .filter(k => k.status === 'aktiv' || wert.value === `k:${k.id}` || aufgaben.value.some(a => a.kontoId === k.id && wert.value === `a:${a.id}`))
  .map(k => ({
    konto: k,
    aufgaben: aufgaben.value.filter(a => a.kontoId === k.id && (a.status === 'offen' || wert.value === `a:${a.id}`)),
  })))

// Anzeige im Trigger selbst rendern (Reka zeigt sonst nur den Rohtext ohne Abstand/Farbe)
const auswahl = computed(() => {
  const { aufgabeId, kontoId } = zielAusWert(wert.value)
  const aufgabe = aufgabeId ? aufgaben.value.find(a => a.id === aufgabeId) : undefined
  const konto = konten.value.find(k => k.id === (aufgabe?.kontoId ?? kontoId))
  return konto ? { aufgabe, konto } : undefined
})
</script>

<template>
  <Select v-model="wert">
    <!-- contain-inline-size: lange Aufgabentitel dürfen den Dialog nicht verbreitern, sondern laufen aus -->
    <SelectTrigger class="w-full min-w-0" :title="auswahl?.aufgabe?.titel">
      <SelectValue placeholder="Aufgabe oder Konto wählen" class="min-w-0 flex-1 contain-inline-size !flex items-center gap-2">
        <template v-if="auswahl">
          <template v-if="auswahl.aufgabe">
            <AufgabeKey v-if="auswahl.aufgabe.key" :wert="auswahl.aufgabe.key" :farbe="auswahl.konto.farbe" />
            <span v-else class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(auswahl.konto.farbe).punkt" />
            <span class="auslaufen min-w-0 flex-1 text-left">{{ auswahl.aufgabe.titel }}</span>
          </template>
          <template v-else>
            <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(auswahl.konto.farbe).punkt" />
            <span class="auslaufen min-w-0 flex-1 text-left">{{ auswahl.konto.name }} <span class="text-muted-foreground">· direkt aufs Konto</span></span>
          </template>
        </template>
      </SelectValue>
    </SelectTrigger>
    <SelectContent class="max-w-[min(36rem,calc(100vw-2rem))]">
      <SelectGroup v-for="g in gruppen" :key="g.konto.id">
        <SelectLabel class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" :class="kontoFarbKlassen(g.konto.farbe).punkt" />
          {{ g.konto.name }}
        </SelectLabel>
        <SelectItem :value="`k:${g.konto.id}`">
          <span class="text-muted-foreground">direkt aufs Konto</span>
        </SelectItem>
        <SelectItem v-for="a in g.aufgaben" :key="a.id" :value="`a:${a.id}`" :title="a.titel" class="*:[span]:last:min-w-0 *:[span]:last:gap-2">
          <AufgabeKey v-if="a.key" :wert="a.key" :farbe="g.konto.farbe" />
          <span class="min-w-0 truncate">{{ a.titel }}</span>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
