import { note } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, noteCreateSchema.parse)
  const assignment = data.taskId != null || data.accountId != null
    ? await resolveAssignment({ kind: 'work', taskId: data.taskId, accountId: data.taskId ? null : data.accountId })
    : {}
  const [created] = await db.insert(note).values({ ...data, ...assignment }).returning()
  return created!
})
