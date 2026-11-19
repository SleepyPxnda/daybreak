import { z } from 'zod'
import { dateSchema, timeSchema } from '#shared/utils/settings'

/** Fields without defaults - basis for PATCH. */
export const templateFields = z.object({
  name: z.string().trim().max(100).transform(n => n || null).nullable(),
  taskId: z.number().int().positive().nullable(),
  accountId: z.number().int().positive().nullable(),
  start: timeSchema,
  end: timeSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1, 'Mindestens ein Wochentag'),
  intervalWeeks: z.number().int().min(1).max(8),
  validFrom: dateSchema,
  validUntil: dateSchema.nullable(),
  active: z.boolean(),
})

export const templateCreateSchema = templateFields.extend({
  name: templateFields.shape.name.default(null),
  taskId: templateFields.shape.taskId.default(null),
  accountId: templateFields.shape.accountId.default(null),
  intervalWeeks: templateFields.shape.intervalWeeks.default(1),
  validUntil: templateFields.shape.validUntil.default(null),
  active: templateFields.shape.active.default(true),
  /** "Save as recurring ..." from the block menu: link this block to the template */
  fromBlockId: z.number().int().positive().optional(),
})
