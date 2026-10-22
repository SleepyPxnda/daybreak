<script setup lang="ts">
import type { TodoArt } from '#shared/utils/todos'
import { TODO_ARTEN } from '#shared/utils/todos'
import type { TodoZeile } from '~/composables/useTodos'

const props = defineProps<{ todo: TodoZeile | null }>()
const offen = defineModel<boolean>('open', { default: false })

const art = ref<TodoArt>('merker')
const text = ref('')
const wer = ref('')
const stichtag = ref('')
const ziel = ref('')

watch(offen, (jetztOffen) => {
  const t = props.todo
  if (!jetztOffen || !t) return
  art.value = t.art
  text.value = t.text
  wer.value = t.wer ?? ''
  stichtag.value = (t.art === 'warten' ? t.nachfassenAm : t.faelligAm) ?? ''
  ziel.value = zielWert(t)
})

async function speichern() {
  if (!props.todo) return
  const ok = await aktion(() => api(`/api/todos/${props.todo!.id}`, {
    method: 'PATCH',
    body: {
      art: art.value,
      text: text.value,
      wer: art.value === 'warten' ? wer.value : null,
      nachfassenAm: art.value === 'warten' ? stichtag.value || null : null,
      faelligAm: art.value === 'merker' ? stichtag.value || null : null,
      ...zielAusWert(ziel.value),
    },
  }), TODO_KEYS)
  if (ok) offen.value = false
}

async function loeschen() {
  if (!props.todo) return
  const ok = await aktion(() => api(`/api/todos/${props.todo!.id}`, { method: 'DELETE' }), TODO_KEYS)
  if (ok) offen.value = false
}
</script>

<template>
  <Dialog v-model:open="offen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogDescription class="sr-only">
          Merker, Warten auf oder Daily-Thema bearbeiten
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="speichern">
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Art</Label>
          <Select v-model="art">
            <SelectTrigger class="w-full rounded-md data-[size=default]:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="a in TODO_ARTEN" :key="a.art" :value="a.art">
                {{ a.einzahl }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="art === 'warten'" class="grid gap-2">
          <Label for="todo-wer" class="text-xs font-normal text-muted-foreground">Auf wen</Label>
          <Input id="todo-wer" v-model="wer" class="h-9 rounded-md" placeholder="z. B. Tim" />
        </div>
        <div class="grid gap-1.5">
          <Label for="todo-text" class="text-xs font-normal text-muted-foreground">Text</Label>
          <Textarea id="todo-text" v-model="text" rows="2" required class="rounded-md" />
        </div>
        <div v-if="art !== 'daily'" class="grid gap-2">
          <Label for="todo-stichtag" class="text-xs font-normal text-muted-foreground">{{ art === 'warten' ? 'Nachfassen am' : 'Fällig am' }} (optional)</Label>
          <Input id="todo-stichtag" v-model="stichtag" type="date" class="h-9 w-44 rounded-md font-mono" />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Bezug (optional)</Label>
          <div class="flex gap-2">
            <ZielAuswahl v-model="ziel" />
            <Button v-if="ziel" type="button" variant="ghost" @click="ziel = ''">
              Entfernen
            </Button>
          </div>
        </div>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" @click="loeschen">
            Löschen
          </Button>
          <Button type="submit" :disabled="!text.trim()">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
