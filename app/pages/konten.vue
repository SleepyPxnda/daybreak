<script setup lang="ts">
import { Archive, Circle, CircleCheck, CircleDot, Pencil, Plus } from '@lucide/vue'

useHead({ title: 'Konten & Aufgaben · daybreak' })

const route = useRoute()
const router = useRouter()
const { data: konten } = useKonten()

const zeigeArchivierte = ref(false)
const sichtbareKonten = computed(() => konten.value.filter(k => zeigeArchivierte.value || k.status === 'aktiv'))

const gewaehltId = computed(() => Number(route.query.konto) || sichtbareKonten.value[0]?.id)
const gewaehlt = computed(() => konten.value.find(k => k.id === gewaehltId.value))

const { data: aufgaben } = useFetch('/api/aufgaben', {
  key: 'konto-aufgaben',
  query: { kontoId: gewaehltId },
  default: () => [],
  immediate: !!gewaehltId.value,
  watch: [gewaehltId],
})

const kontoDialog = ref(false)
const kontoBearbeiten = ref<typeof konten.value[number] | null>(null)
const aufgabeDialog = ref(false)

function neuesKonto() {
  kontoBearbeiten.value = null
  kontoDialog.value = true
}

function kontoAendern() {
  kontoBearbeiten.value = gewaehlt.value ?? null
  kontoDialog.value = true
}

// Anzeige-Status: „In Arbeit“ = offen und schon Zeit gebucht
function statusAnzeige(a: { status: string, gebuchtMin: number }) {
  if (a.status === 'abgeschlossen') return { text: 'Abgeschlossen', icon: CircleCheck, klasse: 'text-positiv' }
  if (a.gebuchtMin > 0) return { text: 'In Arbeit', icon: CircleDot, klasse: 'text-info' }
  return { text: 'Offen', icon: Circle, klasse: 'text-muted-foreground' }
}

function waehle(id: number) {
  router.replace({ query: { konto: id } })
}
</script>

<template>
  <div class="flex flex-wrap items-start gap-6">
    <Card class="max-w-[300px] flex-[1_1_260px] gap-0 py-0">
      <CardHeader class="flex min-h-11 flex-row items-center justify-between py-0 pr-2">
        <CardTitle>Konten</CardTitle>
        <Button size="sm" variant="outline" class="h-[30px] text-[13px]" @click="neuesKonto">
          <Plus /> Neu
        </Button>
      </CardHeader>
      <div class="grid gap-0.5 p-2">
        <button
          v-for="k in sichtbareKonten"
          :key="k.id"
          type="button"
          class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left"
          :class="[k.id === gewaehltId ? 'bg-muted' : 'hover:bg-raised', { 'text-muted-foreground': k.status === 'archiviert' }]"
          :aria-current="k.id === gewaehltId ? 'true' : undefined"
          @click="waehle(k.id)"
        >
          <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ k.name }}</span>
            <span v-if="k.aliase.length" class="block truncate font-mono text-[11px] text-muted-foreground">{{ k.aliase.join(' · ') }}</span>
          </span>
        </button>
        <p v-if="!sichtbareKonten.length" class="px-3 py-2.5 text-sm text-muted-foreground">
          Noch keine Konten.
        </p>
      </div>
      <div class="flex items-center gap-2 border-t px-4 py-3">
        <Switch id="archivierte" v-model="zeigeArchivierte" />
        <Label for="archivierte" class="text-[13px] font-normal text-muted-foreground">Archivierte zeigen</Label>
      </div>
    </Card>

    <section v-if="gewaehlt" class="grid min-w-0 flex-[999_1_560px] gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <span class="size-3 shrink-0 rounded-full" :class="kontoFarbKlassen(gewaehlt.farbe).punkt" />
        <h1 class="min-w-0 truncate text-2xl font-semibold tracking-tight" :title="gewaehlt.name">
          {{ gewaehlt.name }}
        </h1>
        <span v-if="gewaehlt.aliase.length" class="font-mono text-[13px] text-muted-foreground">{{ gewaehlt.aliase.join(' · ') }}</span>
        <span v-if="gewaehlt.status === 'archiviert'" class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Archive class="size-3.5" /> archiviert
        </span>
        <div class="grow" />
        <Button variant="outline" @click="kontoAendern">
          <Pencil /> Bearbeiten
        </Button>
        <Button @click="aufgabeDialog = true">
          <Plus /> Aufgabe
        </Button>
      </div>

      <Card class="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow class="bg-card hover:bg-card">
              <TableHead class="h-9 w-32 px-4 text-xs font-normal text-muted-foreground">
                Key
              </TableHead>
              <TableHead class="h-9 px-4 text-xs font-normal text-muted-foreground">
                Titel
              </TableHead>
              <TableHead class="h-9 w-36 px-4 text-xs font-normal text-muted-foreground">
                Status
              </TableHead>
              <TableHead class="h-9 w-28 px-4 text-right text-xs font-normal text-muted-foreground">
                Schätzung
              </TableHead>
              <TableHead class="h-9 w-28 px-4 text-right text-xs font-normal text-muted-foreground">
                Gebucht
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="a in aufgaben"
              :key="a.id"
              class="h-11 cursor-pointer hover:bg-raised"
              @click="navigateTo(`/aufgaben/${a.id}`)"
            >
              <TableCell class="px-4">
                <AufgabeKey v-if="a.key" :wert="a.key" :farbe="gewaehlt.farbe" :class="{ 'opacity-60': a.status === 'abgeschlossen' }" />
              </TableCell>
              <TableCell class="px-4 whitespace-normal wrap-anywhere" :class="{ 'text-muted-foreground': a.status === 'abgeschlossen' }">
                {{ a.titel }}
              </TableCell>
              <TableCell class="px-4">
                <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="statusAnzeige(a).klasse">
                  <component :is="statusAnzeige(a).icon" class="size-3.5" />
                  {{ statusAnzeige(a).text }}
                </span>
              </TableCell>
              <TableCell class="px-4 text-right text-muted-foreground tabular-nums">
                {{ a.schaetzungMin ? formatDauer(a.schaetzungMin) : '–' }}
              </TableCell>
              <TableCell class="px-4 text-right tabular-nums" :class="{ 'text-negativ': a.schaetzungMin && a.gebuchtMin > a.schaetzungMin }">
                {{ formatDauer(a.gebuchtMin) }}
              </TableCell>
            </TableRow>
            <TableRow v-if="!aufgaben.length" class="hover:bg-transparent">
              <TableCell colspan="5" class="px-4 py-6 text-center whitespace-normal text-muted-foreground">
                Keine Aufgaben – Zeit kann auch direkt aufs Konto gebucht werden.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </section>
    <Card v-else class="min-w-0 flex-[999_1_560px]">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        Lege zuerst ein Konto an – dann klart es hier auf.
      </CardContent>
    </Card>

    <KontoDialog v-model:open="kontoDialog" :konto="kontoBearbeiten" @gespeichert="waehle" />
    <AufgabeDialog v-model:open="aufgabeDialog" :konto-id="gewaehltId" />
  </div>
</template>
