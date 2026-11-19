import { z } from 'zod'
import { account } from '../db/schema'
import { db } from '../db/client'
import { ACCOUNT_COLORS } from '#shared/utils/accounts'

/** Fields without defaults - basis for PATCH (partial must not reset anything). */
export const accountFields = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.enum(ACCOUNT_COLORS),
  aliases: z.array(z.string().trim().toLowerCase().min(1).max(30).regex(/^\S+$/, 'Alias ohne Leerzeichen')),
  status: z.enum(['active', 'archived']),
})

export const accountCreateSchema = accountFields.extend({
  aliases: accountFields.shape.aliases.default([]),
  status: accountFields.shape.status.default('active'),
})

/** Aliases must be unique across all accounts (otherwise quick input is ambiguous). */
export async function checkAliases(aliases: string[], ownId?: number) {
  if (new Set(aliases).size !== aliases.length) throw createError({ statusCode: 400, statusMessage: 'Alias doppelt angegeben' })
  const other = (await db.select({ id: account.id, name: account.name, aliases: account.aliases }).from(account)).filter(k => k.id !== ownId)
  for (const alias of aliases) {
    const owner = other.find(k => k.aliases.includes(alias))
    if (owner) throw createError({ statusCode: 409, statusMessage: `Alias „${alias}“ gehört schon zu ${owner.name}` })
  }
}
