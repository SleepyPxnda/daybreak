import type { BlockBasis } from './blocks'
import { duration } from './blocks'
import type { IsoDate } from './time'

/** Block with display info, as returned by `blockWithDisplay`. */
export interface OverviewBlock extends BlockBasis {
  accountId: number | null
  accountName: string | null
  accountColor: string | null
  taskId: number | null
  taskKey: string | null
  taskTitle: string | null
  note: string | null
}

export interface OverviewDay {
  date: IsoDate
  minutes: number
  /** Share of the task (0-1) */
  share: number
  notes: string[]
}

export interface OverviewTask {
  /** null = booked directly on the account ("without task") */
  taskId: number | null
  key: string | null
  title: string | null
  minutes: number
  /** Share of the account (0-1) */
  share: number
  days: OverviewDay[]
}

export interface OverviewAccount {
  accountId: number
  name: string
  color: string | null
  minutes: number
  /** Share of the total time (0-1) */
  share: number
  tasks: OverviewTask[]
}

export interface Overview {
  total: number
  accounts: OverviewAccount[]
}

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0
}

const byMinutes = (a: { minutes: number }, b: { minutes: number }) => b.minutes - a.minutes

/**
 * Booked work time grouped account -> task -> days.
 * Share per level relative to the level above; sorted by hours descending, days chronological.
 * Planned blocks and breaks do not count (like actual time).
 */
export function groupOverview(blocks: OverviewBlock[]): Overview {
  const accounts = new Map<number, { account: OverviewAccount, tasks: Map<number | null, OverviewTask & { dayMap: Map<IsoDate, OverviewDay> }> }>()

  for (const b of blocks) {
    if (b.kind !== 'work' || b.status !== 'booked' || b.accountId == null) continue
    const minutes = duration(b)

    let k = accounts.get(b.accountId)
    if (!k) {
      k = { account: { accountId: b.accountId, name: b.accountName ?? '', color: b.accountColor, minutes: 0, share: 0, tasks: [] }, tasks: new Map() }
      accounts.set(b.accountId, k)
    }
    k.account.minutes += minutes

    let a = k.tasks.get(b.taskId)
    if (!a) {
      a = { taskId: b.taskId, key: b.taskKey, title: b.taskTitle, minutes: 0, share: 0, days: [], dayMap: new Map() }
      k.tasks.set(b.taskId, a)
    }
    a.minutes += minutes

    let t = a.dayMap.get(b.date)
    if (!t) {
      t = { date: b.date, minutes: 0, share: 0, notes: [] }
      a.dayMap.set(b.date, t)
    }
    t.minutes += minutes
    const note = b.note?.trim()
    if (note && !t.notes.includes(note)) t.notes.push(note)
  }

  const total = [...accounts.values()].reduce((s, k) => s + k.account.minutes, 0)

  const result = [...accounts.values()].map(({ account, tasks }) => ({
    ...account,
    share: share(account.minutes, total),
    tasks: [...tasks.values()].map(({ dayMap, ...a }) => ({
      ...a,
      share: share(a.minutes, account.minutes),
      days: [...dayMap.values()]
        .map(t => ({ ...t, share: share(t.minutes, a.minutes) }))
        .sort((x, y) => x.date.localeCompare(y.date)),
    })).sort(byMinutes),
  })).sort(byMinutes)

  return { total, accounts: result }
}

export interface ClosingAccount {
  accountId: number
  name: string
  color: string | null
  minutes: number
  /** Task keys, otherwise titles, for blocks without a task the block note - without duplicates */
  labels: string[]
}

export interface ClosingDay {
  date: IsoDate
  target: number
  /** Start of the first / end of the last booked work block (null without bookings) */
  start: number | null
  end: number | null
  actual: number
  /** End - start - actual: break blocks and gaps together */
  isBreak: number
  accounts: ClosingAccount[]
}

/** Label of a block for the closing: key -> title -> note. */
function blockLabel(b: OverviewBlock): string | undefined {
  return b.taskKey?.trim() || b.taskTitle?.trim() || b.note?.trim() || undefined
}

/**
 * Month closing: per day start, end, break and the booked time per account,
 * for transferring into the company tool. Break = end - start - actual, so start/end/break always match the actual time.
 * Returns all given days (also without bookings), accounts by hours descending.
 */
export function monthClosing(blocks: OverviewBlock[], days: { date: IsoDate, target: number }[]): ClosingDay[] {
  const booked = blocks.filter(b => b.kind === 'work' && b.status === 'booked' && b.accountId != null)

  return days.map(({ date, target }) => {
    const amDay = booked.filter(b => b.date === date)
    if (!amDay.length) return { date, target, start: null, end: null, actual: 0, isBreak: 0, accounts: [] }

    const accounts = new Map<number, ClosingAccount>()
    for (const b of amDay) {
      const accountId = b.accountId as number
      let k = accounts.get(accountId)
      if (!k) {
        k = { accountId, name: b.accountName ?? '', color: b.accountColor, minutes: 0, labels: [] }
        accounts.set(accountId, k)
      }
      k.minutes += duration(b)
      const label = blockLabel(b)
      if (label && !k.labels.includes(label)) k.labels.push(label)
    }

    const start = Math.min(...amDay.map(b => b.start))
    const end = Math.max(...amDay.map(b => b.end))
    const actual = amDay.reduce((s, b) => s + duration(b), 0)
    return { date, target, start, end, actual, isBreak: end - start - actual, accounts: [...accounts.values()].sort(byMinutes) }
  })
}
