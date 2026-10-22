<script setup lang="ts">
import { Search } from '@lucide/vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import CommandPalette from '~/components/quick-input/CommandPalette.vue'
import SaldoWidget from '~/components/widgets/SaldoWidget.vue'

useErinnerungen()

const paletteOffen = usePaletteOffen()
// Gleicher Key wie in useTag – wird nach jeder Block-Änderung über TAG_KEYS mit aktualisiert
const { data: saldo } = useFetch('/api/saldo', { key: 'saldo' })
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <!-- Kopfzeile: Schnelleingabe und Stundenkonto auf jeder Seite -->
      <header class="flex min-h-14 flex-wrap items-center gap-3 border-b px-6 py-2">
        <SidebarTrigger aria-label="Seitenleiste ein-/ausklappen" />
        <button
          type="button"
          class="flex h-9 min-w-0 flex-[0_1_26rem] items-center gap-2 rounded-md bg-raised px-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="paletteOffen = true"
        >
          <Search class="size-4 shrink-0" />
          <span class="flex-1 truncate text-left">Schnelleingabe oder suchen …</span>
          <kbd class="rounded-sm border px-1.5 font-mono text-[11px]">Strg K</kbd>
        </button>
        <div class="flex-1" />
        <SaldoWidget v-if="saldo" :konto-bis-gestern="saldo.kontoBisGestern" :ist="saldo.heute.ist" :soll="saldo.heute.soll" />
      </header>
      <main class="flex-1 p-8">
        <slot />
      </main>
    </SidebarInset>
    <CommandPalette />
  </SidebarProvider>
</template>
