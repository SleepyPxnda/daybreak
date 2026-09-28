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
</script>

<template>
  <Select v-model="wert">
    <SelectTrigger class="w-full">
      <SelectValue placeholder="Aufgabe oder Konto wählen" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup v-for="g in gruppen" :key="g.konto.id">
        <SelectLabel class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" :class="kontoFarbKlassen(g.konto.farbe).punkt" />
          {{ g.konto.name }}
        </SelectLabel>
        <SelectItem :value="`k:${g.konto.id}`">
          <span class="text-muted-foreground">direkt aufs Konto</span>
        </SelectItem>
        <SelectItem v-for="a in g.aufgaben" :key="a.id" :value="`a:${a.id}`">
          <span v-if="a.key" class="font-mono text-xs text-muted-foreground">{{ a.key }}</span>
          {{ a.titel }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
