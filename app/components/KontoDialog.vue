<script setup lang="ts">
import type { KontoFarbe } from '#shared/utils/konten'
import { KONTO_FARBEN } from '#shared/utils/konten'

interface KontoDaten {
  id: number
  name: string
  farbe: string
  aliase: string[]
  status: 'aktiv' | 'archiviert'
}

const props = defineProps<{ konto?: KontoDaten | null }>()
const offen = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ gespeichert: [id: number] }>()

const name = ref('')
const farbe = ref<KontoFarbe>('lavendel')
const aliase = ref('')
const archiviert = ref(false)

watch(offen, (jetztOffen) => {
  if (!jetztOffen) return
  name.value = props.konto?.name ?? ''
  farbe.value = (props.konto?.farbe as KontoFarbe) ?? 'lavendel'
  aliase.value = props.konto?.aliase.join(', ') ?? ''
  archiviert.value = props.konto?.status === 'archiviert'
})

async function speichern() {
  const body = {
    name: name.value,
    farbe: farbe.value,
    aliase: aliase.value.split(/[,\s]+/).map(a => a.trim()).filter(Boolean),
    status: archiviert.value ? 'archiviert' as const : 'aktiv' as const,
  }
  const ergebnis = await aktion(
    () => props.konto
      ? api<{ id: number }>(`/api/konten/${props.konto.id}`, { method: 'PATCH', body })
      : api<{ id: number }>('/api/konten', { method: 'POST', body }),
    STAMMDATEN_KEYS,
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
        <DialogTitle>{{ konto ? 'Konto bearbeiten' : 'Neues Konto' }}</DialogTitle>
        <DialogDescription>Sammlung, auf die Zeit läuft – Projekt, Kostenstelle oder abstrakt wie „Firmenmeeting“.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="speichern">
        <div class="grid gap-1.5">
          <Label for="konto-name" class="text-xs font-normal text-muted-foreground">Name</Label>
          <Input id="konto-name" v-model="name" class="h-9 rounded-md" required autofocus />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Farbe</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in KONTO_FARBEN"
              :key="f"
              type="button"
              :aria-label="f"
              :aria-pressed="farbe === f"
              class="size-7 rounded-full ring-offset-2 ring-offset-background transition"
              :class="[kontoFarbKlassen(f).punkt, farbe === f ? 'ring-2 ring-ring' : 'opacity-70 hover:opacity-100']"
              @click="farbe = f"
            />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="konto-aliase" class="text-xs font-normal text-muted-foreground">Aliase für die Schnelleingabe</Label>
          <Input id="konto-aliase" v-model="aliase" class="h-9 rounded-md" placeholder="z. B. mtg, meeting" />
        </div>
        <div v-if="konto" class="flex items-center gap-2">
          <Switch id="konto-archiviert" v-model="archiviert" />
          <Label for="konto-archiviert">Archiviert</Label>
        </div>
        <DialogFooter>
          <Button type="submit">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
