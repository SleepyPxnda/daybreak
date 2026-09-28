import { einstellungenSchema } from '#shared/utils/einstellungen'

const schema = einstellungenSchema.partial()
  .refine(e => e.timelineVon === undefined || e.timelineBis === undefined || e.timelineVon < e.timelineBis, 'Timeline: Beginn vor Ende')

export default defineEventHandler(async (event) => {
  const teil = await readValidatedBody(event, schema.parse)
  return speichereEinstellungen(teil)
})
