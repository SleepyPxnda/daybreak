<script setup lang="ts">
import type { AccountColor } from '#shared/utils/accounts'
import { ACCOUNT_COLORS } from '#shared/utils/accounts'

interface AccountData {
  id: number
  name: string
  color: string
  aliases: string[]
  status: 'aktiv' | 'archiviert'
}

const props = defineProps<{ account?: AccountData | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: number] }>()

const name = ref('')
const color = ref<AccountColor>('lavendel')
const aliases = ref('')
const archived = ref(false)

watch(open, (nowOpen) => {
  if (!nowOpen) return
  name.value = props.account?.name ?? ''
  color.value = (props.account?.color as AccountColor) ?? 'lavendel'
  aliases.value = props.account?.aliases.join(', ') ?? ''
  archived.value = props.account?.status === 'archiviert'
})

async function save() {
  const body = {
    name: name.value,
    color: color.value,
    aliases: aliases.value.split(/[,\s]+/).map(a => a.trim()).filter(Boolean),
    status: archived.value ? 'archiviert' as const : 'aktiv' as const,
  }
  const result = await runAction(
    () => props.account
      ? api<{ id: number }>(`/api/accounts/${props.account.id}`, { method: 'PATCH', body })
      : api<{ id: number }>('/api/accounts', { method: 'POST', body }),
    MASTER_DATA_KEYS,
  )
  if (result) {
    open.value = false
    emit('saved', result.id)
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ account ? 'Konto bearbeiten' : 'Neues Konto' }}</DialogTitle>
        <DialogDescription>Sammlung, auf die Zeit läuft – Projekt, Kostenstelle oder abstrakt wie „Firmenmeeting“.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-1.5">
          <Label for="account-name" class="text-xs font-normal text-muted-foreground">Name</Label>
          <Input id="account-name" v-model="name" class="h-9 rounded-md" required autofocus />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs font-normal text-muted-foreground">Farbe</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in ACCOUNT_COLORS"
              :key="f"
              type="button"
              :aria-label="f"
              :aria-pressed="color === f"
              class="size-7 rounded-full ring-offset-2 ring-offset-background transition"
              :class="[accountColorClasses(f).dot, color === f ? 'ring-2 ring-ring' : 'opacity-70 hover:opacity-100']"
              @click="color = f"
            />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="account-aliases" class="text-xs font-normal text-muted-foreground">Aliase für die Schnelleingabe</Label>
          <Input id="account-aliases" v-model="aliases" class="h-9 rounded-md" placeholder="z. B. mtg, meeting" />
        </div>
        <div v-if="account" class="flex items-center gap-2">
          <Switch id="account-archived" v-model="archived" />
          <Label for="account-archived">Archiviert</Label>
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
