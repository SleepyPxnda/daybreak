<script setup lang="ts">
import { CornerDownLeft } from '@lucide/vue'
import { toast } from 'vue-sonner'

// Quick input line on the today page; logic in useQuickInput
const props = defineProps<{ date: string }>()

const { text, result, preview, assignmentText, running, run } = useQuickInput(() => props.date)

async function enter() {
  if (result.value.type === 'search') {
    toast.info('Suchen geht mit Strg+K')
    return
  }
  await run()
}
</script>

<template>
  <div class="grid gap-2">
    <Label for="quick-input" class="text-[13px] font-normal text-muted-foreground">Schnelleingabe</Label>
    <div class="flex flex-wrap gap-2">
      <div class="relative flex-[1_1_480px]">
        <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-primary">›</span>
        <Input
          id="quick-input"
          v-model="text"
          placeholder="2h PROJ-123 Review · 9:00-10:30 mtg · p 30m · t Merker · w Tim: PR-Review bis fr"
          class="h-11 rounded-md border-line-strong pr-12 pl-7 font-mono text-sm"
          :disabled="running"
          @keydown.enter.prevent="enter"
          @keydown.esc="text = ''"
        />
        <kbd class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center rounded-sm border px-1.5 text-muted-foreground">
          <CornerDownLeft class="size-3" />
        </kbd>
      </div>
      <!-- Actions next to the field (e.g. same as yesterday, day closing) -->
      <slot />
    </div>

    <div v-if="result.type !== 'empty'" class="min-h-6 text-[13px]">
      <p v-if="result.type === 'error'" class="text-destructive">
        {{ result.message }}
      </p>
      <p v-else-if="result.type === 'search'" class="text-muted-foreground">
        Dauer oder Präfix voranstellen, z. B. „1h {{ result.text }}“ oder „t {{ result.text }}“ – suchen mit Strg+K
      </p>
      <template v-else-if="preview">
        <p class="wrap-anywhere">
          {{ preview.text }}
          <span v-if="preview.note" class="text-muted-foreground">· „{{ preview.note }}“</span>
        </p>
        <div v-if="result.type === 'block' && result.candidates" class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">Mehrere Treffer:</span>
          <Button v-for="(k, i) in result.candidates" :key="i" size="sm" variant="outline" class="max-w-full" :title="assignmentText(k)" @click="run(k)">
            <span class="truncate">{{ assignmentText(k) }}</span>
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
