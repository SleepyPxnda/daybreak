import type { TargetSettings } from './target'
import { dayInfo } from './target'
import type { IsoDate } from './time'
import { addDays, daysBetween, toIsoDate } from './time'

export type TodoKind = 'reminder' | 'daily_topic' | 'waiting_for'

export const TODO_KINDS: { kind: TodoKind, title: string, singular: string }[] = [
  { kind: 'reminder', title: 'Merker', singular: 'Merker' },
  { kind: 'waiting_for', title: 'Warten auf', singular: 'Warten auf' },
  { kind: 'daily_topic', title: 'Daily-Themen', singular: 'Daily-Thema' },
]

/** Default interval for "followed up" */
export const FOLLOW_UP_WORKDAYS = 3

export interface TodoBasis {
  id: number
  kind: TodoKind
  sortOrder: number
  followUpDate?: IsoDate | null
  dueDate?: IsoDate | null
  doneAt?: string | null
  createdAt: string
}

/** Next day that lies `workdayCount` regular workdays (excluding weekends/holidays) after the given date. */
export function addWorkdays(date: IsoDate, workdayCount: number, settings: TargetSettings): IsoDate {
  let d = date
  let carryover = workdayCount
  while (carryover > 0) {
    d = addDays(d, 1)
    if (dayInfo(d, undefined, settings).isWorkday) carryover--
  }
  return d
}

/** The date relevant for highlighting: follow-up (waiting-for) or due date (reminder). */
export function cutoffDate(todo: Pick<TodoBasis, 'kind' | 'followUpDate' | 'dueDate'>): IsoDate | null {
  if (todo.kind === 'waiting_for') return todo.followUpDate ?? null
  if (todo.kind === 'reminder') return todo.dueDate ?? null
  return null
}

export function isDue(todo: Pick<TodoBasis, 'kind' | 'followUpDate' | 'dueDate'>, today: IsoDate): boolean {
  const day = cutoffDate(todo)
  return day !== null && day <= today
}

/** Age in whole days since creation ("for 5 days"). The creation timestamp is an ISO timestamp (UTC). */
export function daysSince(createdAt: string, today: IsoDate): number {
  return Math.max(0, daysBetween(toIsoDate(new Date(createdAt)), today))
}

export function ageText(days: number): string {
  if (days === 0) return 'seit heute'
  if (days === 1) return 'seit gestern'
  return `seit ${days} Tagen`
}

/**
 * Display order: due/overdue first (oldest cutoff on top), then manual ordering.
 * Waiting-for items are highlighted and listed on top from the follow-up date.
 */
export function sortTodos<T extends TodoBasis>(todos: T[], today: IsoDate): T[] {
  return [...todos].sort((a, b) => {
    const fa = isDue(a, today)
    const fb = isDue(b, today)
    if (fa !== fb) return fa ? -1 : 1
    if (fa && fb) {
      const diff = cutoffDate(a)!.localeCompare(cutoffDate(b)!)
      if (diff) return diff
    }
    return a.sortOrder - b.sortOrder || a.id - b.id
  })
}
