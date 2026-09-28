<script setup lang="ts">
export interface VorlageFormular {
  id?: number
  aufgabeId: number | null
  kontoId: number | null
  start: number
  ende: number
  wochentage: number[]
  intervallWochen: number
  gueltigAb: string
  gueltigBis: string | null
  aktiv: boolean
  /** „Als wiederkehrend speichern …“: Ausgangsblock verknüpfen */
  ausBlockId?: number
}

const props = defineProps<{ vorlage?: VorlageFormular | null }>()
const offen = defineModel<boolean>('open', { default: false })

const ziel = ref('')
const start = ref(570)
const ende = ref(585)
const wochentage = ref<number[]>([1, 2, 3, 4, 5])
const intervall = ref('1')
const gueltigAb = ref(heute())
const gueltigBis = ref('')
const aktiv = ref(true)

watch(offen, (jetztOffen) => {
  if (!jetztOffen) return
  const v = props.vorlage
  ziel.value = v ? zielWert(v) : ''
  start.value = v?.start ?? 570
  ende.value = v?.ende ?? 585
  wochentage.value = [...(v?.wochentage ?? [1, 2, 3, 4, 5])]
  intervall.value = String(v?.intervallWochen ?? 1)
  gueltigAb.value = v?.gueltigAb ?? heute()
  gueltigBis.value = v?.gueltigBis ?? ''
  aktiv.value = v?.aktiv ?? true
})

async function speichern() {
  const body = {
    ...zielAusWert(ziel.value),
    start: start.value,
    ende: ende.value,
    wochentage: wochentage.value,
    intervallWochen: Number(intervall.value),
    gueltigAb: gueltigAb.value,
    gueltigBis: gueltigBis.value || null,
    aktiv: aktiv.value,
  }
  const id = props.vorlage?.id
  const ok = await aktion(
    () => id
      ? api(`/api/vorlagen/${id}`, { method: 'PATCH', body })
      : api('/api/vorlagen', { method: 'POST', body: { ...body, ausBlockId: props.vorlage?.ausBlockId } }),
    ['vorlagen', 'tag-bloecke'],
  )
  if (ok) offen.value = false
}
</script>

<template>
  <Dialog v-model:open="offen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ vorlage?.id ? 'Wiederkehrenden Block bearbeiten' : 'Wiederkehrender Block' }}</DialogTitle>
        <DialogDescription>
          Wird automatisch als geplanter Block eingetragen (bis 14 Tage voraus). Änderungen wirken nur auf zukünftige, noch geplante Termine.
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="speichern">
        <div class="grid gap-2">
          <Label>Ziel</Label>
          <ZielAuswahl v-model="ziel" />
        </div>
        <div class="flex items-end gap-3">
          <div class="grid gap-2">
            <Label>Von</Label>
            <UhrzeitInput v-model="start" />
          </div>
          <div class="grid gap-2">
            <Label>Bis</Label>
            <UhrzeitInput v-model="ende" />
          </div>
          <div class="grid gap-2">
            <Label>Rhythmus</Label>
            <Select v-model="intervall">
              <SelectTrigger class="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  jede Woche
                </SelectItem>
                <SelectItem value="2">
                  jede 2. Woche
                </SelectItem>
                <SelectItem value="3">
                  jede 3. Woche
                </SelectItem>
                <SelectItem value="4">
                  jede 4. Woche
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="grid gap-2">
          <Label>Wochentage</Label>
          <WochentagAuswahl v-model="wochentage" />
        </div>
        <div class="flex gap-3">
          <div class="grid gap-2">
            <Label for="vorlage-ab">Gültig ab</Label>
            <Input id="vorlage-ab" v-model="gueltigAb" type="date" required />
          </div>
          <div class="grid gap-2">
            <Label for="vorlage-bis">Gültig bis (optional)</Label>
            <Input id="vorlage-bis" v-model="gueltigBis" type="date" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="vorlage-aktiv" v-model="aktiv" />
          <Label for="vorlage-aktiv">Aktiv</Label>
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="!ziel || !wochentage.length || start >= ende">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
