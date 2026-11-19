<script setup lang="ts">
import type { TodoKind } from '#shared/utils/todos'
import { TODO_KINDS } from '#shared/utils/todos'
import type { TodoRow } from '~/composables/useTodos'

const props = defineProps<{ todo: TodoRow | null }>()
const open = defineModel<boolean>('open', { default: false })

const kind = ref<TodoKind>('merker')
const text = ref('')
const person = ref('')
const cutoffDate = ref('')
const assignment = ref('')

watch(open, (nowOpen) => {
  const t = props.todo
  if (!nowOpen || !t) return
  kind.value = t.kind
  text.value = t.text
  person.value = t.person ?? ''
  cutoffDate.value = (t.kind === 'warten' ? t.followUpDate : t.dueDate) ?? ''
  assignment.value = assignmentValue(t)
})

async function save() {
  if (!props.todo) return
  const ok = await runAction(() => api(`/api/todos/${props.todo!.id}`, {
    method: 'PATCH',
    body: {
      kind: kind.value,
      text: text.value,
      person: kind.value === 'warten' ? person.value : null,
      followUpDate: kind.value === 'warten' ? cutoffDate.value || null : null,
      dueDate: kind.value === 'merker' ? cutoffDate.value || null : null,
      ...assignmentFromValue(assignment.value),
    },
  }), TODO_KEYS)
  if (ok) open.value = false
}

async function remove() {
  if (!props.todo) return
  const ok = await runAction(() => api(`/api/todos/${props.todo!.id}`, { method: 'DELETE' }), TODO_KEYS)
  if (ok) open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogDescription class="sr-only">
          Merker, Warten auf oder Daily-Thema bearbeiten
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Art</Label>
          <Select v-model="kind">
            <SelectTrigger class="w-full rounded-md data-[size=default]:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="a in TODO_KINDS" :key="a.kind" :value="a.kind">
                {{ a.singular }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="kind === 'warten'" class="grid gap-2">
          <Label for="todo-person" class="text-xs font-normal text-muted-foreground">Auf wen</Label>
          <Input id="todo-person" v-model="person" class="h-9 rounded-md" placeholder="z. B. Tim" />
        </div>
        <div class="grid gap-1.5">
          <Label for="todo-text" class="text-xs font-normal text-muted-foreground">Text</Label>
          <Textarea id="todo-text" v-model="text" rows="2" required class="rounded-md" />
        </div>
        <div v-if="kind !== 'daily'" class="grid gap-2">
          <Label for="todo-cutoff-date" class="text-xs font-normal text-muted-foreground">{{ kind === 'warten' ? 'Nachfassen am' : 'Fällig am' }} (optional)</Label>
          <Input id="todo-cutoff-date" v-model="cutoffDate" type="date" class="h-9 w-44 rounded-md font-mono" />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Bezug (optional)</Label>
          <div class="flex gap-2">
            <AssignmentPicker v-model="assignment" />
            <Button v-if="assignment" type="button" variant="ghost" @click="assignment = ''">
              Entfernen
            </Button>
          </div>
        </div>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" @click="remove">
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
