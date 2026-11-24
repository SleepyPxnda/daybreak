import type { BlockKind, BlockStatus } from './blocks'
import type { NoteKind } from './notes'
import type { TodoKind } from './todos'
import type { IsoDate } from './time'
import { isIsoDate, addDays, GRID_MIN, DAY_MIN, weekday } from './time'
import { normalizeForComparison } from './text'

// Quick input - pure parser, writes nothing.
// Book/plan time, breaks, reminders (t), daily topics (d), waiting-for (w), notes (n).

export interface QuickInputTask {
  id: number
  key?: string | null
  title: string
  accountId: number
  status: 'open' | 'closed'
}

export interface QuickInputAccount {
  id: number
  name: string
  aliases: string[]
  status: 'active' | 'archived'
}

export interface QuickInputContext {
  today: IsoDate
  /** Day without a date (e.g. the currently shown day); default: today */
  standardDate?: IsoDate
  tasks: QuickInputTask[]
  accounts: QuickInputAccount[]
}

export type QuickInputAssignment =
  | { type: 'task', taskId: number, accountId: number }
  | { type: 'account', accountId: number }
  | { type: 'newTask', title: string, accountId: number }

export type QuickInputTime = { duration: number } | { start: number, end: number }

export interface QuickInputBlock {
  type: 'block'
  kind: BlockKind
  status: BlockStatus
  date: IsoDate
  time: QuickInputTime
  /** Unique assignment (missing for breaks and when ambiguous) */
  assignment?: QuickInputAssignment
  /** Several matches -> selection popover */
  candidates?: QuickInputAssignment[]
  note?: string
}

export interface QuickInputTodo {
  type: 'todo'
  todoKind: TodoKind
  text: string
  /** Waiting-for only: text before the first ":" */
  person?: string
  /** `bis <date>`: follow-up date (waiting-for) or due date (reminder) */
  cutoffDate?: IsoDate
}

/** `n title`, `nm|np|ni [key] title` - new note, opens the editor */
export interface QuickInputNote {
  type: 'note'
  title: string
  kind?: NoteKind
  /** Only for the kind prefixes: first word was an exact task key */
  taskId?: number
}

export type QuickInputResult =
  | { type: 'empty' }
  | { type: 'search', text: string }
  | { type: 'error', message: string }
  | QuickInputBlock
  | QuickInputTodo
  | QuickInputNote

const NOTE_KIND_PREFIXES: Record<string, NoteKind> = { nm: 'meeting', np: 'problem', ni: 'info' }

const TODO_PREFIXES: Record<string, TodoKind> = { t: 'reminder', d: 'daily_topic', w: 'waiting_for' }

/** `t ...`, `d ...`, `w who: ...` - optional `bis <date>` at the end (not for daily topics). */
function parseTodo(todoKind: TodoKind, words: string[], today: IsoDate): QuickInputTodo | { type: 'error', message: string } {
  let carryover = words
  let cutoffDate: IsoDate | undefined
  if (todoKind !== 'daily_topic' && carryover.length >= 3 && normalizeForComparison(carryover.at(-2)!) === 'bis') {
    cutoffDate = parseDateToken(carryover.at(-1)!, today, 'forward')
    if (cutoffDate) carryover = carryover.slice(0, -2)
  }

  let text = carryover.join(' ').trim()
  let person: string | undefined
  if (todoKind === 'waiting_for') {
    const colon = text.indexOf(':')
    if (colon > 0) {
      person = text.slice(0, colon).trim()
      text = text.slice(colon + 1).trim()
    }
  }
  if (!text) return { type: 'error', message: 'Text fehlt' }
  return { type: 'todo', todoKind, text, ...(person ? { person } : {}), ...(cutoffDate ? { cutoffDate } : {}) }
}

const WEEKDAYS: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7 }

/** '2h', '1.5h', '1,5h', '1h30', '45m', '90m' -> minutes; undefined if not a duration token */
export function parseDuration(token: string): number | undefined {
  const normalizedToken = normalizeForComparison(token)
  let m = /^(\d+(?:[.,]\d+)?)h$/.exec(normalizedToken)
  if (m) return Math.round(Number(m[1]!.replace(',', '.')) * 60)
  m = /^(\d+)h(\d{1,2})m?$/.exec(normalizedToken)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = /^(\d+)m(?:in)?$/.exec(normalizedToken)
  if (m) return Number(m[1])
  return undefined
}

/** '9:00-10:30', '9-10', '14:15-15' -> range; undefined if not a range token */
export function parseTimeRange(token: string): { start: number, end: number } | undefined {
  const m = /^(\d{1,2})(?::(\d{2}))?[-–](\d{1,2})(?::(\d{2}))?$/.exec(token)
  if (!m) return undefined
  return {
    start: Number(m[1]) * 60 + Number(m[2] ?? 0),
    end: Number(m[3]) * 60 + Number(m[4] ?? 0),
  }
}

/** Date token relative to today; for planned blocks weekdays point forward, for booked ones backward. */
export function parseDateToken(token: string, today: IsoDate, direction: 'forward' | 'backward'): IsoDate | undefined {
  const normalizedToken = normalizeForComparison(token)
  if (normalizedToken === 'heute') return today
  if (normalizedToken === 'morgen') return addDays(today, 1)
  if (normalizedToken === 'übermorgen' || normalizedToken === 'uebermorgen') return addDays(today, 2)
  if (normalizedToken === 'gestern') return addDays(today, -1)
  if (isIsoDate(normalizedToken)) return normalizedToken
  const targetWeekday = WEEKDAYS[normalizedToken]
  if (targetWeekday === undefined) return undefined
  const current = weekday(today)
  if (direction === 'forward') return addDays(today, ((targetWeekday - current + 6) % 7) + 1) // 1...7 days forward
  return addDays(today, -((current - targetWeekday + 7) % 7)) // 0...6 days back
}

function titleMatches(query: string[], title: string): boolean {
  const normalizedTitle = normalizeForComparison(title)
  return query.every(word => normalizedTitle.includes(normalizeForComparison(word)))
}

/** Longest word prefix of the words that matches at least one candidate. */
function fuzzyPrefix<T>(words: string[], candidates: T[], text: (candidate: T) => string, onlyFull = false) {
  for (let prefixLength = words.length; prefixLength >= (onlyFull ? words.length : 1); prefixLength--) {
    const query = words.slice(0, prefixLength)
    const hit = candidates.filter(candidate => titleMatches(query, text(candidate)))
    if (hit.length > 0) return { hit, carryover: words.slice(prefixLength) }
  }
  return undefined
}

const noteFrom = (words: string[]) => (words.length ? words.join(' ') : undefined)

function findAccount(name: string, accounts: QuickInputAccount[]): QuickInputAccount[] {
  const normalizedName = normalizeForComparison(name)
  const active = accounts.filter(account => account.status === 'active')
  const perAlias = active.filter(account => account.aliases.some(alias => normalizeForComparison(alias) === normalizedName))
  if (perAlias.length) return perAlias
  const exact = active.filter(account => normalizeForComparison(account.name) === normalizedName)
  if (exact.length) return exact
  return active.filter(account => normalizeForComparison(account.name).includes(normalizedName))
}

type AssignmentResult = { assignment?: QuickInputAssignment, candidates?: QuickInputAssignment[], note?: string } | { error: string }

/** Assignment detection: exact key -> account alias -> fuzzy tasks -> (@account: new task) -> fuzzy account names */
function detectAssignment(words: string[], atAccount: QuickInputAccount | undefined, ctx: QuickInputContext): AssignmentResult {
  const [first, ...after] = words

  if (first) {
    const perKey = ctx.tasks.find(a => a.key && normalizeForComparison(a.key) === normalizeForComparison(first))
    if (perKey) return { assignment: { type: 'task', taskId: perKey.id, accountId: perKey.accountId }, note: noteFrom(after) }

    const perAlias = ctx.accounts.find(account => account.status === 'active' && account.aliases.some(alias => normalizeForComparison(alias) === normalizeForComparison(first)))
    if (perAlias) return { assignment: { type: 'account', accountId: perAlias.id }, note: noteFrom(after) }
  }

  if (atAccount && words.length === 0) return { assignment: { type: 'account', accountId: atAccount.id } }

  const open = ctx.tasks.filter(a => a.status === 'open' && (!atAccount || a.accountId === atAccount.id))
  // With @account the whole text must match - otherwise it is a new task (e.g. "2h New idea @apollo")
  const tasksHit = fuzzyPrefix(words, open, a => a.title, !!atAccount)
  if (tasksHit) {
    const assignments = tasksHit.hit.map(a => ({ type: 'task' as const, taskId: a.id, accountId: a.accountId }))
    const note = noteFrom(tasksHit.carryover)
    return assignments.length === 1 ? { assignment: assignments[0], note } : { candidates: assignments, note }
  }

  if (atAccount) return { assignment: { type: 'newTask', title: words.join(' '), accountId: atAccount.id } }

  const activeAccounts = ctx.accounts.filter(account => account.status === 'active')
  const accountHit = fuzzyPrefix(words, activeAccounts, account => account.name)
  if (accountHit) {
    const assignments = accountHit.hit.map(account => ({ type: 'account' as const, accountId: account.id }))
    const note = noteFrom(accountHit.carryover)
    return assignments.length === 1 ? { assignment: assignments[0], note } : { candidates: assignments, note }
  }

  return { error: 'Keine Aufgabe und kein Konto gefunden – mit @konto als neue Aufgabe anlegen' }
}

export function parseQuickInput(input: string, ctx: QuickInputContext): QuickInputResult {
  const text = input.trim()
  if (!text) return { type: 'empty' }
  let words = text.split(/\s+/)

  const todoKind = TODO_PREFIXES[normalizeForComparison(words[0]!)]
  if (todoKind) return parseTodo(todoKind, words.slice(1), ctx.today)

  if (normalizeForComparison(words[0]!) === 'n') {
    const title = words.slice(1).join(' ')
    return title ? { type: 'note', title } : { type: 'error', message: 'Titel fehlt' }
  }

  const noteKind = NOTE_KIND_PREFIXES[normalizeForComparison(words[0]!)]
  if (noteKind) {
    const [first, ...after] = words.slice(1)
    const perKey = first ? ctx.tasks.find(task => task.key && normalizeForComparison(task.key) === normalizeForComparison(first)) : undefined
    if (perKey) return { type: 'note', kind: noteKind, taskId: perKey.id, title: after.join(' ') || perKey.title }
    const title = words.slice(1).join(' ')
    return title ? { type: 'note', kind: noteKind, title } : { type: 'error', message: 'Titel fehlt' }
  }

  let kind: BlockKind = 'work'
  let status: BlockStatus = 'booked'
  const prefix = normalizeForComparison(words[0]!)
  if (prefix === 'p') kind = 'break'
  else if (prefix === 'plan') status = 'planned'
  const hasPrefix = kind === 'break' || status === 'planned'
  if (hasPrefix) words = words.slice(1)

  // Duration or time directly after the prefix
  const timeToken = words[0] ?? ''
  const duration = parseDuration(timeToken)
  const range = duration === undefined ? parseTimeRange(timeToken) : undefined
  if (duration === undefined && !range) {
    return hasPrefix ? { type: 'error', message: 'Dauer (z. B. 2h, 45m) oder Uhrzeit (9:00-10:30) fehlt' } : { type: 'search', text }
  }
  words = words.slice(1)

  let time: QuickInputTime
  if (duration !== undefined) {
    if (duration <= 0 || duration > DAY_MIN) return { type: 'error', message: 'Ungültige Dauer' }
    if (duration % GRID_MIN !== 0) return { type: 'error', message: 'Dauer muss im 15-Minuten-Raster liegen' }
    time = { duration }
  }
  else {
    const { start, end } = range!
    if (start % GRID_MIN !== 0 || end % GRID_MIN !== 0) return { type: 'error', message: 'Uhrzeiten müssen im 15-Minuten-Raster liegen' }
    if (start >= end || end > DAY_MIN) return { type: 'error', message: 'Ungültiger Zeitraum' }
    time = { start, end }
  }

  // Date as the last word
  let date = ctx.standardDate ?? ctx.today
  const last = words.at(-1)
  const dateFromToken = last ? parseDateToken(last, ctx.today, status === 'planned' ? 'forward' : 'backward') : undefined
  if (dateFromToken) {
    date = dateFromToken
    words = words.slice(0, -1)
  }
  if (status === 'booked' && date > ctx.today) {
    return { type: 'error', message: 'Gebucht werden kann nur bis heute – für die Zukunft „plan“ voranstellen' }
  }

  if (kind === 'break') return { type: 'block', kind, status, date, time, note: noteFrom(words) }

  // @account (anywhere in the text)
  let atAccount: QuickInputAccount | undefined
  const atToken = words.find(w => w.startsWith('@') && w.length > 1)
  if (atToken) {
    const hit = findAccount(atToken.slice(1), ctx.accounts)
    if (hit.length === 0) return { type: 'error', message: `Konto ${atToken} nicht gefunden` }
    if (hit.length > 1) return { type: 'error', message: `Konto ${atToken} ist mehrdeutig` }
    atAccount = hit[0]
    words = words.filter(w => w !== atToken)
  }

  const assignment = detectAssignment(words, atAccount, ctx)
  if ('error' in assignment) return { type: 'error', message: assignment.error }
  return { type: 'block', kind, status, date, time, ...assignment }
}
