import type { SQL } from 'drizzle-orm'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, account, note } from '../../db/schema'
import { db } from '../../db/client'
import { noteExcerpt } from '#shared/utils/notes'

const querySchema = z.object({
  /** Search over title + content (LIKE is enough for v1) */
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  taskId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  kind: z.enum(['meeting', 'problem', 'info']).optional(),
  pinned: z.enum(['1']).optional(),
  /** Also return the full `content` (task page only) */
  includeContent: z.enum(['1']).optional(),
})

// List without full content (excerpt only, unless includeContent=1); pinned first, then most recently changed
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const filter: SQL[] = []
  if (query.q) filter.push(or(contains(note.title, query.q), contains(note.content, query.q))!)
  if (query.tag) filter.push(sql`exists (select 1 from json_each(${note.tags}) where value = ${query.tag})`)
  if (query.taskId) filter.push(eq(note.taskId, query.taskId))
  if (query.accountId) filter.push(eq(note.accountId, query.accountId))
  if (query.kind) filter.push(eq(note.kind, query.kind))
  if (query.pinned) filter.push(eq(note.pinned, true))

  const rows = await db.select({
    id: note.id,
    title: note.title,
    content: note.content,
    kind: note.kind,
    tags: note.tags,
    pinned: note.pinned,
    taskId: note.taskId,
    accountId: note.accountId,
    updatedAt: note.updatedAt,
    taskTitle: task.title,
    taskKey: task.key,
    accountName: account.name,
    accountColor: account.color,
  })
    .from(note)
    .leftJoin(task, eq(task.id, note.taskId))
    .leftJoin(account, eq(account.id, note.accountId))
    .where(and(...filter))
    .orderBy(desc(note.pinned), desc(note.updatedAt))
    .limit(300)

  return rows.map(({ content, ...carryover }) => ({
    ...carryover,
    excerpt: noteExcerpt(content),
    ...(query.includeContent ? { content } : {}),
  }))
})
