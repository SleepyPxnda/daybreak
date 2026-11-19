import { settingsSchema } from '#shared/utils/settings'

const schema = settingsSchema.partial()
  .refine(e => e.timelineVon === undefined || e.timelineBis === undefined || e.timelineVon < e.timelineBis, 'Timeline: Beginn vor Ende')

export default defineEventHandler(async (event) => {
  const part = await readValidatedBody(event, schema.parse)
  return saveSettings(part)
})
