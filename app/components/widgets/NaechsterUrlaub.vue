<script setup lang="ts">
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, Palmtree } from '@lucide/vue'

// Nächster Urlaub auf „Heute“: als Karte, bzw. als Banner über der Timeline, sobald die Erinnerung greift
const props = defineProps<{ darstellung: 'banner' | 'karte' }>()

const { data } = useFetch('/api/urlaub/naechster', { key: 'naechster-urlaub' })

const urlaub = computed(() => data.value?.urlaub ?? null)
const hervorgehoben = computed(() => !!data.value && (data.value.erinnern || !!urlaub.value?.laeuft))
const sichtbar = computed(() => (props.darstellung === 'banner' ? hervorgehoben.value : !hervorgehoben.value))

const f = (d: string) => format(zuDate(d), 'EEE d. MMM', { locale: de })
const zeitraum = computed(() => {
  const u = urlaub.value
  if (!u) return ''
  return u.von === u.bis ? f(u.von) : `${f(u.von)} – ${f(u.bis)}`
})
const zahl = (t: number) => t.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Nach der Übergabe bestätigen: danach nur noch der Urlaubsvermerk, ohne Erinnerungstext
function bestaetigen() {
  const u = urlaub.value
  if (u) aktion(() => api('/api/urlaub/bestaetigen', { method: 'POST', body: { von: u.von, bis: u.bis } }), ['naechster-urlaub'])
}

const countdown = computed(() => {
  const u = urlaub.value
  if (!u) return ''
  if (u.laeuft) return `Im Urlaub bis ${f(u.bis)}`
  if (u.tageBis === 1) return 'Urlaub ab morgen'
  return `Urlaub in ${u.tageBis} Tagen`
})
</script>

<template>
  <!-- Banner: Erinnerung bzw. laufender Urlaub -->
  <div
    v-if="sichtbar && darstellung === 'banner' && urlaub"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-info-subtle py-2.5 pr-3 pl-4 text-sm"
  >
    <Palmtree class="size-[18px] shrink-0 text-info" />
    <span class="font-semibold text-info">{{ countdown }}</span>
    <span class="tabular-nums">
      {{ zeitraum }} · {{ zahl(urlaub.urlaubstage) }} Urlaubstag{{ urlaub.urlaubstage === 1 ? '' : 'e' }}
      <template v-if="!urlaub.laeuft"> · noch {{ urlaub.arbeitstageBis }} Arbeitstag{{ urlaub.arbeitstageBis === 1 ? '' : 'e' }} davor</template>
    </span>
    <Button v-if="!urlaub.laeuft && !urlaub.bestaetigt" size="sm" variant="outline" class="ml-auto" @click="bestaetigen">
      <Check /> Bestätigen
    </Button>
    <span v-if="!urlaub.laeuft && !urlaub.bestaetigt && data?.erinnerungText" class="basis-full pl-[30px] text-muted-foreground">{{ data.erinnerungText }}</span>
  </div>

  <!-- Karte unter der Timeline -->
  <Card v-else-if="sichtbar && darstellung === 'karte'">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Palmtree class="size-4 text-info" /> Nächster Urlaub
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-1 text-sm tabular-nums">
      <template v-if="urlaub">
        <span class="font-medium">{{ zeitraum }}</span>
        <span class="text-muted-foreground">
          {{ countdown.replace('Urlaub ', '') }} · {{ zahl(urlaub.urlaubstage) }} Urlaubstag{{ urlaub.urlaubstage === 1 ? '' : 'e' }}
        </span>
      </template>
      <NuxtLink v-else to="/kalender" class="text-muted-foreground hover:text-foreground hover:underline">
        Kein Urlaub geplant – im Kalender eintragen
      </NuxtLink>
    </CardContent>
  </Card>
</template>
