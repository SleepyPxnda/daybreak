import { account } from '../../db/schema'
import { db } from '../../db/client'
import { compareAccountOrder } from '#shared/utils/accounts'

export default defineEventHandler(async () => (await db.select().from(account)).sort(compareAccountOrder))
