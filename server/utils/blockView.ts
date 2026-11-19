import { and, asc, eq, getTableColumns, gte, lte } from 'drizzle-orm'
import { task, block, account, template } from '../db/schema'
import { db } from '../db/client'
import type { IsoDate } from '#shared/utils/time'

/** Block columns + display info (task/account/template) - for queries with LEFT JOIN on task/account/template. */
export const blockWithDisplay = {
  ...getTableColumns(block),
  taskKey: task.key,
  taskTitle: task.title,
  accountName: account.name,
  accountColor: account.color,
  templateName: template.name,
}

/** Booked work blocks in the range (inclusive) with display info, chronological. */
export function loadBookedWork(from: IsoDate, to: IsoDate) {
  return db.select(blockWithDisplay)
    .from(block)
    .leftJoin(task, eq(task.id, block.taskId))
    .leftJoin(account, eq(account.id, block.accountId))
    .leftJoin(template, eq(template.id, block.templateId))
    .where(and(gte(block.date, from), lte(block.date, to), eq(block.kind, 'work'), eq(block.status, 'booked')))
    .orderBy(asc(block.date), asc(block.start))
}
