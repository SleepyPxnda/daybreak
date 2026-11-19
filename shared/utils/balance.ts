import type { TargetSettings, DayEntry } from './target'
import { dayInfo } from './target'
import type { IsoDate } from './time'
import { dateRange, addDays } from './time'

export interface BalanceStart {
  date: IsoDate
  balanceMin: number
}

export interface BalanceInput {
  start: BalanceStart
  /** Cutoff day "today" - does not count toward the balance */
  today: IsoDate
  /** Booked work minutes per day */
  actualPerDay: Record<IsoDate, number>
  /** Stored daily deviations */
  days: Record<IsoDate, DayEntry>
  settings: TargetSettings
}

export function dayDelta(actual: number, target: number): number {
  return actual - target
}

/**
 * Balance = start balance + sum of daily deltas (start date ... yesterday).
 * Today and future days do not count.
 */
export function currentBalance({ start, today, actualPerDay, days, settings }: BalanceInput): number {
  const yesterday = addDays(today, -1)
  let balance = start.balanceMin
  for (const date of dateRange(start.date, yesterday)) {
    const { target } = dayInfo(date, days[date], settings)
    balance += dayDelta(actualPerDay[date] ?? 0, target)
  }
  return balance
}

export interface MonthBalance {
  /** 'YYYY-MM' */
  month: string
  /** Sum of daily deltas of the month (only days from the start date until yesterday) */
  delta: number
  /** Balance at month end - in the current month the state until yesterday */
  state: number
  /** Current month: not closed yet */
  ongoing: boolean
}

/**
 * Month view: monthly delta + balance at month end, from the start date month to the current month.
 * The state of the last month equals the overall balance.
 */
export function balanceHistory({ start, today, actualPerDay, days, settings }: BalanceInput): MonthBalance[] {
  const yesterday = addDays(today, -1)
  const todayMonth = today.slice(0, 7)
  const history: MonthBalance[] = []
  let state = start.balanceMin

  for (const date of dateRange(start.date, yesterday)) {
    const month = date.slice(0, 7)
    let entry = history.at(-1)
    if (entry?.month !== month) {
      entry = { month, delta: 0, state, ongoing: month === todayMonth }
      history.push(entry)
    }
    const { target } = dayInfo(date, days[date], settings)
    const delta = dayDelta(actualPerDay[date] ?? 0, target)
    entry.delta += delta
    state += delta
    entry.state = state
  }

  // Current month without a closed day (e.g. today = the 1st) or start today
  if (start.date <= today && history.at(-1)?.month !== todayMonth)
    history.push({ month: todayMonth, delta: 0, state, ongoing: true })

  return history
}
