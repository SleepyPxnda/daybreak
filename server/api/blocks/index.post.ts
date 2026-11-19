import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { block } from '../../db/schema'
import { db } from '../../db/client'
import { nextFreeSlot } from '#shared/utils/blocks'
import { dateSchema, timeSchema } from '#shared/utils/settings'
import { GRID_MIN, DAY_MIN } from '#shared/utils/time'

const schema = z.object({
  date: dateSchema,
  kind: z.enum(['work', 'break']),
  status: z.enum(['planned', 'booked']),
  // Either a fixed time ...
  start: timeSchema.optional(),
  end: timeSchema.optional(),
  // ... or a duration: next free slot
  duration: z.number().int().positive().max(DAY_MIN).multipleOf(GRID_MIN).optional(),
  taskId: z.number().int().positive().nullish(),
  accountId: z.number().int().positive().nullish(),
  note: z.string().trim().max(2000).nullish(),
}).refine(b => (b.start !== undefined && b.end !== undefined) !== (b.duration !== undefined), 'Entweder start+ende oder dauer angeben')

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, schema.parse)
  const assignment = await resolveAssignment(data)

  let { start, end } = data
  if (data.duration !== undefined) {
    const { workStart } = await loadSettings()
    const dayBlocks = await db.select({ start: block.start, end: block.end }).from(block).where(eq(block.date, data.date))
    start = nextFreeSlot(dayBlocks, workStart)
    end = start + data.duration
    if (end > DAY_MIN) throw createError({ statusCode: 409, statusMessage: 'Kein Platz mehr an diesem Tag' })
  }

  await assertValidRange(data.date, { start: start!, end: end! })
  const [created] = await db.insert(block).values({
    date: data.date,
    kind: data.kind,
    status: data.status,
    start: start!,
    end: end!,
    ...assignment,
    note: data.note || null,
  }).returning()
  return created!
})
