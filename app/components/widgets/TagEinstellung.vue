<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { TagTyp } from '#shared/utils/soll'

const props = defineProps<{
  datum: string
  typ: TagTyp
  soll: number
  feiertag?: string
  istArbeitstag: boolean
  notiz: string | null
}>()

const TYPEN: { wert: TagTyp, label: string }[] = [
  { wert: 'arbeit', label: 'Arbeitstag' },
  { wert: 'urlaub', label: 'Urlaub' },
  { wert: 'halb_urlaub', label: '½ Urlaub' },
  { wert: 'krank', label: 'Krank' },
  { wert: 'gleittag', label: 'Gleittag' },
]

const label = computed(() => {
  if (props.feiertag) return props.feiertag
  if (!props.istArbeitstag && props.typ === 'arbeit') return 'Frei'
  return TYPEN.find(t => t.wert === props.typ)?.label ?? props.typ
})

const offen = ref(false)
const gewaehlterTyp = ref<TagTyp>('arbeit')
const overrideStunden = ref<number | null | undefined>()
const tagNotiz = ref('')

watch(offen, (jetztOffen) => {
  if (!jetztOffen) return
  gewaehlterTyp.value = props.typ
  overrideStunden.value = undefined
  tagNotiz.value = props.notiz ?? ''
})

async function speichern() {
  const ok = await aktion(() => api(`/api/tage/${props.datum}`, {
    method: 'PUT',
    body: {
      typ: gewaehlterTyp.value,
      sollOverride: overrideStunden.value == null ? null : aufRaster(overrideStunden.value * 60),
      notiz: tagNotiz.value || null,
    },
  }), TAG_KEYS)
  if (ok) offen.value = false
}
</script>

<template>
  <Popover v-model:open="offen">
    <PopoverTrigger as-child>
      <Button variant="outline">
        {{ label }} · Soll <span class="font-mono">{{ formatDauer(soll) }}</span>
        <ChevronDown />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-72">
      <form class="grid gap-3" @submit.prevent="speichern">
        <div class="grid gap-2">
          <Label>Tagestyp</Label>
          <Select v-model="gewaehlterTyp">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in TYPEN" :key="t.wert" :value="t.wert">
                {{ t.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="feiertag || !istArbeitstag" class="text-xs text-muted-foreground">
            Kein regulärer Arbeitstag – Abwesenheiten zählen hier nicht.
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="soll-override">Soll abweichend (Stunden, optional)</Label>
          <ZahlInput id="soll-override" v-model="overrideStunden" :min="0" :max="24" :step="0.25" placeholder="z. B. 4" class="w-36" />
        </div>
        <div class="grid gap-2">
          <Label for="tag-notiz">Notiz</Label>
          <Input id="tag-notiz" v-model="tagNotiz" />
        </div>
        <Button type="submit">
          Übernehmen
        </Button>
      </form>
    </PopoverContent>
  </Popover>
</template>
