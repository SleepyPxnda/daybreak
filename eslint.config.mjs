// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // shadcn-vue-Komponenten sind generiert und werden nicht von Hand gepflegt
  ignores: ['app/components/ui/**', 'drizzle/**'],
})
