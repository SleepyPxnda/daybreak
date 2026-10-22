<script setup lang="ts">
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  ListTodo,
  NotebookPen,
  Settings,
  Sunrise,
} from '@lucide/vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const route = useRoute()

const gruppen = [
  {
    titel: 'Zeit',
    eintraege: [
      { title: 'Heute', to: '/', icon: Sunrise },
      { title: 'Woche', to: '/woche', icon: CalendarRange },
      { title: 'Übersicht', to: '/uebersicht', icon: BarChart3 },
      { title: 'Kalender', to: '/kalender', icon: CalendarDays },
    ],
  },
  {
    titel: 'Arbeit',
    eintraege: [
      { title: 'Merker & Daily', to: '/todos', icon: ListTodo },
      { title: 'Notizen', to: '/notizen', icon: NotebookPen },
      { title: 'Konten & Aufgaben', to: '/konten', icon: FolderKanban },
    ],
  },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  // Aufgaben-Detail gehört zu „Konten & Aufgaben“
  return route.path.startsWith(to) || (to === '/konten' && route.path.startsWith('/aufgaben'))
}

// Aktiver Eintrag: Akzent-Text auf dunkler Akzent-Tönung (Marke)
const eintragKlasse = 'h-9 text-muted-foreground data-active:bg-primary/12 data-active:text-primary data-active:hover:bg-primary/12 data-active:hover:text-primary'
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="pt-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <!-- Lockup: Wolken-Icon + Tool-Name in Akzentfarbe (Geist Mono). Eingeklappt nur das Icon. -->
          <SidebarMenuButton size="lg" as-child class="h-10 hover:bg-transparent group-data-[collapsible=icon]:justify-center">
            <NuxtLink to="/">
              <AppLogo class="size-7! shrink-0" />
              <span class="font-mono text-base font-medium tracking-[-0.01em] text-primary group-data-[collapsible=icon]:hidden">daybreak</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="g in gruppen" :key="g.titel">
        <SidebarGroupLabel>{{ g.titel }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in g.eintraege" :key="item.to">
              <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title" :class="eintragKlasse">
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
    <SidebarFooter class="pb-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child :is-active="isActive('/einstellungen')" tooltip="Einstellungen" :class="eintragKlasse">
            <NuxtLink to="/einstellungen">
              <Settings />
              <span>Einstellungen</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
