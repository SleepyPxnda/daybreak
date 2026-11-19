import { differenceInCalendarWeeks } from 'date-fns'
import type { TimeRange } from './blocks'
import { overlaps } from './blocks'
import type { DayInfo } from './target'
import type { IsoDate } from './time'
import { dateRange, addDays, weekday, toDate } from './time'

/** How far into the future templates are materialized at most. */
export const TEMPLATE_HORIZON_DAYS = 14

export interface TemplateRule extends TimeRange {
  id: number
  /** ISO weekdays 1 = Mon ... 7 = Sun */
  weekdays: number[]
  intervalWeeks: number
  validFrom: IsoDate
  validUntil?: IsoDate | null
  active: boolean
}

export interface ExistingBlock extends TimeRange {
  date: IsoDate
  templateId?: number | null
}

export interface MaterializationInput {
  templates: TemplateRule[]
  from: IsoDate
  to: IsoDate
  today: IsoDate
  dayInfo: (date: IsoDate) => DayInfo
  /** Deleted single occurrences */
  exceptions: { templateId: number, date: IsoDate }[]
  /** All blocks in the range (including those from templates) */
  existing: ExistingBlock[]
}

export interface MaterializationResult {
  created: (TimeRange & { templateId: number, date: IsoDate })[]
  /** Range occupied -> not generated (notice badge on the day) */
  conflicts: { templateId: number, date: IsoDate }[]
}

/** Does the template apply on this day (ignoring target/occupancy)? */
export function templateAppliesOn(template: TemplateRule, date: IsoDate): boolean {
  if (!template.active) return false
  if (date < template.validFrom) return false
  if (template.validUntil && date > template.validUntil) return false
  if (!template.weekdays.includes(weekday(date))) return false
  const interval = Math.max(1, template.intervalWeeks)
  const weeks = differenceInCalendarWeeks(toDate(date), toDate(template.validFrom), { weekStartsOn: 1 })
  return weeks % interval === 0
}

/** Templates only generate on regular workdays without a full-day absence. */
export function templatesAllowedOn(info: DayInfo): boolean {
  return info.isWorkday && (info.type === 'work' || info.type === 'half_vacation')
}

/** Which planned blocks are missing in the range? Pure - writes nothing. */
export function materialize(input: MaterializationInput): MaterializationResult {
  const limit = addDays(input.today, TEMPLATE_HORIZON_DAYS)
  const to = input.to < limit ? input.to : limit
  const exceptions = new Set(input.exceptions.map(a => `${a.templateId}|${a.date}`))
  const present = new Set(input.existing.filter(b => b.templateId != null).map(b => `${b.templateId}|${b.date}`))

  const occupancy = new Map<IsoDate, TimeRange[]>()
  for (const b of input.existing) {
    const list = occupancy.get(b.date) ?? []
    list.push(b)
    occupancy.set(b.date, list)
  }

  const result: MaterializationResult = { created: [], conflicts: [] }
  for (const date of dateRange(input.from, to)) {
    if (!templatesAllowedOn(input.dayInfo(date))) continue
    const day = occupancy.get(date) ?? []
    for (const template of input.templates) {
      const key = `${template.id}|${date}`
      if (!templateAppliesOn(template, date) || present.has(key) || exceptions.has(key)) continue
      if (day.some(b => overlaps(b, template))) {
        result.conflicts.push({ templateId: template.id, date })
        continue
      }
      const block = { templateId: template.id, date, start: template.start, end: template.end }
      result.created.push(block)
      day.push(block)
      occupancy.set(date, day)
    }
  }
  return result
}
