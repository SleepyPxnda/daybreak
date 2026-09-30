import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

/**
 * libsql lädt sein natives Binary dynamisch (`require(`@libsql/${target}`)`), das erkennt
 * Nitros Dependency-Tracing nicht. Wir geben das installierte Plattform-Paket explizit mit –
 * installiert ist jeweils nur das passende (win32-x64-msvc lokal, linux-x64-gnu im Container).
 */
function libsqlNativeBinaries(): string[] {
  const requireFromClient = createRequire(createRequire(import.meta.url).resolve('@libsql/client'))
  const libsqlEntry = requireFromClient.resolve('libsql')
  const requireFromLibsql = createRequire(libsqlEntry)
  const pkg = JSON.parse(readFileSync(join(dirname(libsqlEntry), 'package.json'), 'utf8'))
  return Object.keys(pkg.optionalDependencies ?? {}).flatMap((name) => {
    try {
      return [requireFromLibsql.resolve(name)]
    }
    catch {
      return []
    }
  })
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['shadcn-nuxt', '@nuxt/eslint'],
  css: ['vue-sonner/style.css', '~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'de', class: 'dark' },
      title: 'Daybreak',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  nitro: {
    externals: {
      traceInclude: libsqlNativeBinaries(),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
