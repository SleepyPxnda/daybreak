import { asc } from 'drizzle-orm'
import { account } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(() => db.select().from(account).orderBy(asc(account.name)))
