<script setup lang="ts">
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  ListTodo,
  NotebookPen,
  Search,
  Settings,
  Sunrise,
} from '@lucide/vue'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const route = useRoute()
const paletteOffen = usePaletteOffen()

const navigation = [
  { title: 'Heute', to: '/', icon: Sunrise },
  { title: 'Woche', to: '/woche', icon: CalendarRange },
  { title: 'Übersicht', to: '/uebersicht', icon: BarChart3 },
  { title: 'Kalender', to: '/kalender', icon: CalendarDays },
  { title: 'Merker & Daily', to: '/todos', icon: ListTodo },
  { title: 'Notizen', to: '/notizen', icon: NotebookPen },
  { title: 'Konten & Aufgaben', to: '/konten', icon: FolderKanban },
  { title: 'Einstellungen', to: '/einstellungen', icon: Settings },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <!-- Eingeklappt: nur das Logo, zentriert -->
          <SidebarMenuButton size="lg" as-child class="group-data-[collapsible=icon]:justify-center">
            <NuxtLink to="/">
              <Sunrise class="text-primary" />
              <span class="font-semibold group-data-[collapsible=icon]:hidden">Daybreak</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Schnelleingabe (Strg+K)" class="text-muted-foreground" @click="paletteOffen = true">
            <Search />
            <span class="flex-1">Schnelleingabe</span>
            <kbd class="rounded border px-1.5 font-mono text-[10px]">Strg K</kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation" :key="item.to">
              <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title">
                <NuxtLink :to="item.to">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
