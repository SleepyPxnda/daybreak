import type { SQL } from 'drizzle-orm'
import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, account, note } from '../../db/schema'
import { db } from '../../db/client'
import { mentionsNote, mentionsTaskKey, noteExcerpt } from '#shared/utils/notes'

const querySchema = z.object({
  /** Search over title + content (LIKE is enough for v1) */
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  taskId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  kind: z.enum(['meeting', 'problem', 'info']).optional(),
  pinned: z.enum(['1']).optional(),
  /** Only these notes: comma-separated ids (`3,12`), at most 50 */
  ids: z.string().regex(/^\d+(,\d+)*$/).transform(text => text.split(',').map(Number)).pipe(z.array(z.number().int().positive()).max(50)).optional(),
  /** Notes other than this one whose text references it */
  mentionsNoteId: z.coerce.number().int().positive().optional(),
  /** Notes whose text references this task's key, except notes whose "Bezug" is the task */
  mentionsTaskId: z.coerce.number().int().positive().optional(),
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
  // Notes whose "Bezug" is the account itself, or a task that currently belongs to it
  if (query.accountId) filter.push(or(and(isNull(note.taskId), eq(note.accountId, query.accountId)), eq(task.accountId, query.accountId))!)
  if (query.ids) filter.push(inArray(note.id, query.ids))
  if (query.kind) filter.push(eq(note.kind, query.kind))
  if (query.pinned) filter.push(eq(note.pinned, true))

  let mentionsPredicate: ((content: string) => boolean) | undefined
  if (query.mentionsNoteId) {
    const noteId = query.mentionsNoteId
    filter.push(ne(note.id, noteId), contains(note.content, '[['))
    mentionsPredicate = content => mentionsNote(content, noteId)
  }
  if (query.mentionsTaskId) {
    const [mentionedTask] = await db.select({ key: task.key }).from(task).where(eq(task.id, query.mentionsTaskId))
    const key = mentionedTask?.key
    if (!key) return []
    filter.push(or(isNull(note.taskId), ne(note.taskId, query.mentionsTaskId))!, contains(note.content, '[['))
    mentionsPredicate = content => mentionsTaskKey(content, key)
  }

  // The account of a note with a task is the task's current account (note.accountId can be stale after the task moved)
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
    .leftJoin(account, eq(account.id, sql`coalesce(${task.accountId}, ${note.accountId})`))
    .where(and(...filter))
    .orderBy(desc(note.pinned), desc(note.updatedAt))
    .limit(mentionsPredicate ? Number.MAX_SAFE_INTEGER : 300)

  // Mention filters run on the parsed references, so the limit applies after them
  const matchingRows = mentionsPredicate ? rows.filter(row => mentionsPredicate(row.content)).slice(0, 300) : rows

  return matchingRows.map(({ content, ...carryover }) => ({
    ...carryover,
    excerpt: noteExcerpt(content),
    ...(query.includeContent ? { content } : {}),
  }))
})
