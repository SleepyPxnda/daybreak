import { settingsSchema } from '#shared/utils/settings'

const schema = settingsSchema.partial()
  .refine(e => e.timelineFrom === undefined || e.timelineTo === undefined || e.timelineFrom < e.timelineTo, 'Timeline: Beginn vor Ende')

export default defineEventHandler(async (event) => {
  const part = await readValidatedBody(event, schema.parse)
  return saveSettings(part)
})
