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

const groups = [
  {
    title: 'Zeit',
    entries: [
      { title: 'Heute', to: '/', icon: Sunrise },
      { title: 'Woche', to: '/week', icon: CalendarRange },
      { title: 'Übersicht', to: '/overview', icon: BarChart3 },
      { title: 'Kalender', to: '/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Arbeit',
    entries: [
      { title: 'Merker & Daily', to: '/todos', icon: ListTodo },
      { title: 'Notizen', to: '/notes', icon: NotebookPen },
      { title: 'Konten & Aufgaben', to: '/accounts', icon: FolderKanban },
    ],
  },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  // Task detail belongs to the accounts and tasks entry
  return route.path.startsWith(to) || (to === '/accounts' && route.path.startsWith('/tasks'))
}

// Active entry: accent text on a dark accent tint (brand)
const entryClass = 'h-9 text-muted-foreground data-active:bg-primary/12 data-active:text-primary data-active:hover:bg-primary/12 data-active:hover:text-primary'
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="pt-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <!-- Lockup: cloud icon + tool name in accent color (Geist Mono). Collapsed: icon only. -->
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
      <SidebarGroup v-for="g in groups" :key="g.title">
        <SidebarGroupLabel>{{ g.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in g.entries" :key="item.to">
              <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title" :class="entryClass">
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
          <SidebarMenuButton as-child :is-active="isActive('/settings')" tooltip="Einstellungen" :class="entryClass">
            <NuxtLink to="/settings">
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
