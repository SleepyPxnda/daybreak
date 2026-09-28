<script setup lang="ts">
import { Pencil, Plus } from '@lucide/vue'

useHead({ title: 'Konten & Aufgaben · Daybreak' })

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

function waehle(id: number) {
  router.replace({ query: { konto: id } })
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle>Konten</CardTitle>
        <Button size="sm" variant="secondary" @click="neuesKonto">
          <Plus /> Neu
        </Button>
      </CardHeader>
      <CardContent class="grid gap-1">
        <button
          v-for="k in sichtbareKonten"
          :key="k.id"
          type="button"
          class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          :class="{ 'bg-accent': k.id === gewaehltId, 'text-muted-foreground': k.status === 'archiviert' }"
          @click="waehle(k.id)"
        >
          <span class="size-2.5 shrink-0 rounded-full" :class="kontoFarbKlassen(k.farbe).punkt" />
          <span class="flex-1 truncate">{{ k.name }}</span>
          <span v-if="k.aliase.length" class="text-xs text-muted-foreground">{{ k.aliase.join(', ') }}</span>
        </button>
        <p v-if="!sichtbareKonten.length" class="text-sm text-muted-foreground">
          Noch keine Konten.
        </p>
        <div class="mt-3 flex items-center gap-2">
          <Switch id="archivierte" v-model="zeigeArchivierte" />
          <Label for="archivierte" class="text-muted-foreground">Archivierte zeigen</Label>
        </div>
      </CardContent>
    </Card>

    <Card v-if="gewaehlt">
      <CardHeader class="flex flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="size-3 rounded-full" :class="kontoFarbKlassen(gewaehlt.farbe).punkt" />
          <CardTitle>{{ gewaehlt.name }}</CardTitle>
          <Badge v-if="gewaehlt.status === 'archiviert'" variant="secondary">
            archiviert
          </Badge>
        </div>
        <div class="flex gap-2">
          <Button size="sm" variant="ghost" @click="kontoAendern">
            <Pencil /> Bearbeiten
          </Button>
          <Button size="sm" @click="aufgabeDialog = true">
            <Plus /> Aufgabe
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-32">
                Key
              </TableHead>
              <TableHead>Titel</TableHead>
              <TableHead class="w-32">
                Status
              </TableHead>
              <TableHead class="w-28 text-right">
                Schätzung
              </TableHead>
              <TableHead class="w-28 text-right">
                Gebucht
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="a in aufgaben"
              :key="a.id"
              class="cursor-pointer"
              :class="{ 'text-muted-foreground': a.status === 'abgeschlossen' }"
              @click="navigateTo(`/aufgaben/${a.id}`)"
            >
              <TableCell class="font-mono text-xs">
                {{ a.key }}
              </TableCell>
              <TableCell>{{ a.titel }}</TableCell>
              <TableCell>
                <Badge :variant="a.status === 'offen' ? 'outline' : 'secondary'">
                  {{ a.status }}
                </Badge>
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ a.schaetzungMin ? formatDauer(a.schaetzungMin) : '–' }}
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ formatDauer(a.gebuchtMin) }}
              </TableCell>
            </TableRow>
            <TableRow v-if="!aufgaben.length">
              <TableCell colspan="5" class="text-muted-foreground">
                Keine Aufgaben – Zeit kann auch direkt aufs Konto gebucht werden.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Card v-else>
      <CardContent class="py-10 text-center text-muted-foreground">
        Lege zuerst ein Konto an.
      </CardContent>
    </Card>

    <KontoDialog v-model:open="kontoDialog" :konto="kontoBearbeiten" @gespeichert="waehle" />
    <AufgabeDialog v-model:open="aufgabeDialog" :konto-id="gewaehltId" />
  </div>
</template>
