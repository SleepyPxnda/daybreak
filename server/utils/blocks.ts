import { and, eq, ne } from 'drizzle-orm'
import { task, block, account } from '../db/schema'
import { db } from '../db/client'
import type { BlockKind, TimeRange } from '#shared/utils/blocks'
import { findOverlap, isValidRange } from '#shared/utils/blocks'
import type { IsoDate } from '#shared/utils/time'
import { formatTime } from '#shared/utils/time'

type Executor = Pick<typeof db, 'select'>

export interface AssignmentInput {
  kind: BlockKind
  taskId?: number | null
  accountId?: number | null
}

/**
 * Work needs an account; if a task is set, the account comes from it.
 * Breaks have neither task nor account.
 */
export async function resolveAssignment(input: AssignmentInput, tx: Executor = db): Promise<{ taskId: number | null, accountId: number | null }> {
  if (input.kind === 'pause') return { taskId: null, accountId: null }

  if (input.taskId != null) {
    const [a] = await tx.select({ accountId: task.accountId }).from(task).where(eq(task.id, input.taskId))
    if (!a) throw createError({ statusCode: 400, statusMessage: 'Aufgabe existiert nicht' })
    return { taskId: input.taskId, accountId: a.accountId }
  }

  if (input.accountId == null) throw createError({ statusCode: 400, statusMessage: 'Arbeitsblock braucht Aufgabe oder Konto' })
  const [k] = await tx.select({ id: account.id }).from(account).where(eq(account.id, input.accountId))
  if (!k) throw createError({ statusCode: 400, statusMessage: 'Konto existiert nicht' })
  return { taskId: null, accountId: input.accountId }
}

/** Range valid and free (no overlap). */
export async function assertValidRange(date: IsoDate, range: TimeRange, ignoreId?: number, tx: Executor = db) {
  if (!isValidRange(range)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum (15-min-Raster, Start vor Ende)' })
  }
  const dayBlocks = await tx
    .select({ id: block.id, start: block.start, end: block.end })
    .from(block)
    .where(ignoreId === undefined ? eq(block.date, date) : and(eq(block.date, date), ne(block.id, ignoreId)))
  const collision = findOverlap(dayBlocks, range)
  if (collision) {
    throw createError({
      statusCode: 409,
      statusMessage: `Überschneidet sich mit Block ${formatTime(collision.start)}–${formatTime(collision.end)}`,
    })
  }
}
