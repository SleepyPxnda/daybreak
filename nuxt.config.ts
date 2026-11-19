import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

/**
 * libsql loads its native binary dynamically (`require(`@libsql/${target}`)`), which
 * Nitro's dependency tracing does not detect. We pass the installed platform package explicitly -
 * only the matching one is installed (win32-x64-msvc locally, linux-x64-gnu in the container).
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
      title: 'daybreak · cloudypanda',
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
