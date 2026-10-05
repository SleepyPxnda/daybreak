<script setup lang="ts">
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import CommandPalette from '~/components/quick-input/CommandPalette.vue'
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-12 items-center gap-2 border-b px-4">
        <SidebarTrigger />
      </header>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </SidebarInset>
    <CommandPalette />
  </SidebarProvider>
</template>
