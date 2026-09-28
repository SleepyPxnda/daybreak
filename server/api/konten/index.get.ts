import { asc } from 'drizzle-orm'
import { konto } from '../../db/schema'
import { db } from '../../db/client'

export default defineEventHandler(() => db.select().from(konto).orderBy(asc(konto.name)))
