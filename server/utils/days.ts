import { and, gte, lte } from 'drizzle-orm'
import { day } from '../db/schema'
import { db } from '../db/client'
import type { Settings } from '#shared/utils/settings'
import type { DayEntry, DayInfo } from '#shared/utils/target'
import { dayInfo } from '#shared/utils/target'
import type { IsoDate } from '#shared/utils/time'
import { dateRange } from '#shared/utils/time'

export async function loadDayEntries(from: IsoDate, to: IsoDate): Promise<Record<IsoDate, DayEntry & { note: string | null, blocker: boolean, confirmed: boolean }>> {
  const rows = await db.select().from(day).where(and(gte(day.date, from), lte(day.date, to)))
  return Object.fromEntries(rows.map(z => [z.date, z]))
}

export type DayInfoWithNote = DayInfo & { note: string | null, targetOverride: number | null, blocker: boolean, confirmed: boolean }

/** Day info (target, holiday, type) for every day in the range, plus note, stored target override and blocker. */
export async function loadDayInfos(from: IsoDate, to: IsoDate, settings: Settings): Promise<DayInfoWithNote[]> {
  const entries = await loadDayEntries(from, to)
  return dateRange(from, to).map(date => ({
    ...dayInfo(date, entries[date], settings),
    note: entries[date]?.note ?? null,
    targetOverride: entries[date]?.targetOverride ?? null,
    blocker: entries[date]?.blocker ?? false,
    confirmed: entries[date]?.confirmed ?? false,
  }))
}
