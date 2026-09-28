<script setup lang="ts">
interface AufgabeDaten {
  id: number
  kontoId: number
  key: string | null
  titel: string
  schaetzungMin: number | null
}

const props = defineProps<{
  aufgabe?: AufgabeDaten | null
  /** Vorauswahl beim Anlegen */
  kontoId?: number | null
}>()
const offen = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ gespeichert: [id: number] }>()

const { data: konten } = useKonten()
const aktiveKonten = computed(() => konten.value.filter(k => k.status === 'aktiv' || k.id === props.aufgabe?.kontoId))

const gewaehltesKonto = ref<string>('')
const key = ref('')
const titel = ref('')
const schaetzungStunden = ref<number | undefined>()

watch(offen, (jetztOffen) => {
  if (!jetztOffen) return
  gewaehltesKonto.value = String(props.aufgabe?.kontoId ?? props.kontoId ?? '')
  key.value = props.aufgabe?.key ?? ''
  titel.value = props.aufgabe?.titel ?? ''
  schaetzungStunden.value = props.aufgabe?.schaetzungMin ? props.aufgabe.schaetzungMin / 60 : undefined
})

async function speichern() {
  const body = {
    kontoId: Number(gewaehltesKonto.value),
    key: key.value,
    titel: titel.value,
    schaetzungMin: schaetzungStunden.value ? Math.round(schaetzungStunden.value * 60) : null,
  }
  const ergebnis = await aktion(
    () => props.aufgabe
      ? api<{ id: number }>(`/api/aufgaben/${props.aufgabe.id}`, { method: 'PATCH', body })
      : api<{ id: number }>('/api/aufgaben', { method: 'POST', body }),
    [...STAMMDATEN_KEYS, 'konto-aufgaben', 'aufgabe-detail'],
  )
  if (ergebnis) {
    offen.value = false
    emit('gespeichert', ergebnis.id)
  }
}
</script>

<template>
  <Dialog v-model:open="offen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ aufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</DialogTitle>
        <DialogDescription>Eine Aufgabe gehört zu genau einem Konto.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="speichern">
        <div class="grid gap-2">
          <Label>Konto</Label>
          <Select v-model="gewaehltesKonto" required>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Konto wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="k in aktiveKonten" :key="k.id" :value="String(k.id)">
                <span class="size-2.5 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
                {{ k.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-[8rem_1fr] gap-3">
          <div class="grid gap-2">
            <Label for="aufgabe-key">Key</Label>
            <Input id="aufgabe-key" v-model="key" placeholder="PROJ-123" />
          </div>
          <div class="grid gap-2">
            <Label for="aufgabe-titel">Titel</Label>
            <Input id="aufgabe-titel" v-model="titel" required autofocus />
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="aufgabe-schaetzung">Schätzung (Stunden, optional)</Label>
          <Input id="aufgabe-schaetzung" v-model.number="schaetzungStunden" type="number" min="0" step="0.25" class="w-32" />
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="!gewaehltesKonto">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
