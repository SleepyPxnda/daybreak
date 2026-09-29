<script setup lang="ts">
import { GripVertical } from '@lucide/vue'

// Plan §5: offene Aufgaben mit Buchungen der letzten 14 Tage oder Planung heute – per Drag auf die Timeline
const props = defineProps<{ datum: string }>()

const { data: aufgaben } = useFetch('/api/aufgaben', {
  key: 'aufgaben-in-arbeit',
  query: { inArbeit: toRef(props, 'datum') },
  default: () => [],
})
const { data: konten } = useKonten()
const farbe = (kontoId: number) => konten.value.find(k => k.id === kontoId)?.farbe

function dragStart(e: DragEvent, id: number) {
  e.dataTransfer?.setData(DRAG_AUFGABE, String(id))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">
        Aufgaben in Arbeit
      </CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-1 gap-1">
      <p v-if="!aufgaben.length" class="text-sm text-muted-foreground">
        Keine – buche per Schnelleingabe oder lege Aufgaben unter Konten an.
      </p>
      <div
        v-for="a in aufgaben"
        :key="a.id"
        draggable="true"
        class="group relative flex cursor-grab items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-accent active:cursor-grabbing"
        @dragstart="dragStart($event, a.id)"
      >
        <!-- Griff liegt im Karten-Innenabstand, damit er links keinen Platz belegt -->
        <GripVertical class="absolute top-1/2 -left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100" />
        <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(farbe(a.kontoId)).punkt" />
        <NuxtLink :to="`/aufgaben/${a.id}`" class="auslaufen min-w-0 flex-1 hover:underline" draggable="false" :title="a.titel">
          <AufgabeKey v-if="a.key" :wert="a.key" :farbe="farbe(a.kontoId)" class="mr-1" />
          {{ a.titel }}
        </NuxtLink>
        <span class="shrink-0 tabular-nums text-muted-foreground">{{ formatDauer(a.gebuchtMin) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
