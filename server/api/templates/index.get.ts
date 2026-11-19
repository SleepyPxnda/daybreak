import { asc, eq, getTableColumns } from 'drizzle-orm'
import { task, account, template } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(() =>
  db.select({
    ...getTableColumns(template),
    taskKey: task.key,
    taskTitle: task.title,
    accountName: account.name,
    accountColor: account.color,
  })
    .from(template)
    .leftJoin(task, eq(task.id, template.taskId))
    .leftJoin(account, eq(account.id, template.accountId))
    .orderBy(asc(template.start)),
)
