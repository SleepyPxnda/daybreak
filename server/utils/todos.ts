import { getTableColumns } from 'drizzle-orm'
import { z } from 'zod'
import { task, account, todo } from '../db/schema'
import { dateSchema } from '#shared/utils/settings'

/** Fields without defaults - basis for PATCH. */
export const todoFields = z.object({
  kind: z.enum(['reminder', 'daily_topic', 'waiting_for']),
  text: z.string().trim().min(1).max(1000),
  person: z.string().trim().max(100).transform(w => w || null).nullable(),
  followUpDate: dateSchema.nullable(),
  dueDate: dateSchema.nullable(),
  taskId: z.number().int().positive().nullable(),
  accountId: z.number().int().positive().nullable(),
})

export const todoCreateSchema = todoFields.partial().required({ kind: true, text: true })

/** Discard fields that do not fit the kind (who/follow-up only for waiting-for, due only for reminder). */
export function cleanTodo<T extends Partial<z.infer<typeof todoFields>>>(kind: string, data: T): T {
  const clean = { ...data }
  if (kind !== 'waiting_for') {
    if ('wer' in clean) clean.person = null
    if ('followUpDate' in clean) clean.followUpDate = null
  }
  if (kind !== 'reminder' && 'dueDate' in clean) clean.dueDate = null
  return clean
}

/** Todo + reference (task/account) for display - for queries with LEFT JOIN on task/account. */
export const todoWithReference = {
  ...getTableColumns(todo),
  taskKey: task.key,
  taskTitle: task.title,
  accountName: account.name,
  accountColor: account.color,
}
