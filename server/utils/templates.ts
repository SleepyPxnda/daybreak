import { and, eq, gte, lte } from 'drizzle-orm'
import { block, template, templateException } from '../db/schema'
import { db } from '../db/client'
import type { Settings } from '#shared/utils/settings'
import { dayInfo } from '#shared/utils/target'
import { materialize } from '#shared/utils/templates'
import type { IsoDate } from '#shared/utils/time'
import { today } from '#shared/utils/time'
import { loadDayEntries } from './days'

/**
 * Creates missing planned blocks of all active templates in the range (at most 14 days ahead).
 * Returns the conflicts (range occupied) for the notice badge.
 */
export async function materializeTemplates(from: IsoDate, to: IsoDate, settings: Settings) {
  const templates = await db.select().from(template).where(eq(template.active, true))
  if (templates.length === 0) return { conflicts: [] }

  const [days, exceptions, existing] = await Promise.all([
    loadDayEntries(from, to),
    db.select().from(templateException).where(and(gte(templateException.date, from), lte(templateException.date, to))),
    db.select({ date: block.date, start: block.start, end: block.end, templateId: block.templateId })
      .from(block)
      .where(and(gte(block.date, from), lte(block.date, to))),
  ])

  const { created, conflicts } = materialize({
    templates,
    from,
    to,
    today: today(),
    dayInfo: date => dayInfo(date, days[date], settings),
    exceptions,
    existing,
  })

  if (created.length) {
    const templatesById = new Map(templates.map(v => [v.id, v]))
    await db.insert(block).values(created.map((b) => {
      const v = templatesById.get(b.templateId)!
      return {
        ...b,
        kind: 'work' as const,
        status: 'planned' as const,
        taskId: v.taskId,
        accountId: v.accountId,
      }
    })).onConflictDoNothing()
  }

  return { conflicts }
}
