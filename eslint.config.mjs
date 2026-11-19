// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // shadcn-vue components are generated and not maintained by hand
  ignores: ['app/components/ui/**', 'drizzle/**'],
})
