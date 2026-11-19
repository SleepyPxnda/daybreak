import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { task, block, account, template } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const { from, to } = await getValidatedQuery(event, rangeQuerySchema.parse)
  const settings = await loadSettings()
  // On load, generate missing planned blocks from templates
  const { conflicts } = await materializeTemplates(from, to, settings)

  const blocks = await db.select(blockWithDisplay)
    .from(block)
    .leftJoin(task, eq(task.id, block.taskId))
    .leftJoin(account, eq(account.id, block.accountId))
    .leftJoin(template, eq(template.id, block.templateId))
    .where(and(gte(block.date, from), lte(block.date, to)))
    .orderBy(asc(block.date), asc(block.start))

  return { blocks, conflicts }
})
