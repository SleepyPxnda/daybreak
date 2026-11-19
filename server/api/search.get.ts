import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { task, account, note, todo } from '../db/schema'
import { db } from '../db/client'

const querySchema = z.object({ q: z.string().trim().min(1).max(100) })

// Without prefix / no match: search across tasks, accounts, notes, todos
export default defineEventHandler(async (event) => {
  const { q } = await getValidatedQuery(event, querySchema.parse)

  const [tasks, accounts, notes, todos] = await Promise.all([
    db.select({ id: task.id, key: task.key, title: task.title, status: task.status, accountColor: account.color })
      .from(task)
      .innerJoin(account, eq(account.id, task.accountId))
      .where(or(contains(task.title, q), contains(task.key, q)))
      .orderBy(desc(sql`${task.status} = 'offen'`), desc(task.id))
      .limit(8),
    db.select({ id: account.id, name: account.name, color: account.color, status: account.status })
      .from(account)
      .where(or(contains(account.name, q), contains(account.aliases, q)))
      .limit(5),
    db.select({ id: note.id, title: note.title, pinned: note.pinned })
      .from(note)
      .where(or(contains(note.title, q), contains(note.content, q)))
      .orderBy(desc(sql`${contains(note.title, q)}`), desc(note.updatedAt))
      .limit(8),
    db.select({ id: todo.id, kind: todo.kind, text: todo.text, person: todo.person })
      .from(todo)
      .where(and(isNull(todo.doneAt), or(contains(todo.text, q), contains(todo.person, q))))
      .limit(8),
  ])

  return { tasks, accounts, notes, todos }
})
