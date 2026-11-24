import { describe, expect, it } from 'vitest'
import { parseDateToken, parseDuration, parseQuickInput, parseTimeRange } from '../shared/utils/quickInput'
import type { QuickInputContext } from '../shared/utils/quickInput'
import { normalizeForComparison } from '../shared/utils/text'

// Mon 28 Sep 2026
const ctx: QuickInputContext = {
  today: '2026-09-28',
  accounts: [
    { id: 1, name: 'Projekt Apollo', aliases: ['apollo'], status: 'active' },
    { id: 2, name: 'Wartung', aliases: [], status: 'active' },
    { id: 3, name: 'Firmenmeeting', aliases: ['mtg'], status: 'active' },
    { id: 4, name: 'Altprojekt', aliases: ['alt'], status: 'archived' },
  ],
  tasks: [
    { id: 10, key: 'PROJ-123', title: 'Login-Refactoring', accountId: 1, status: 'open' },
    { id: 11, key: 'PROJ-124', title: 'Logout-Button', accountId: 1, status: 'open' },
    { id: 12, key: null, title: 'Server-Updates', accountId: 2, status: 'open' },
    { id: 13, key: 'OLD-1', title: 'Login alt', accountId: 2, status: 'closed' },
  ],
}

const parse = (text: string) => parseQuickInput(text, ctx)

describe('parseDuration', () => {
  it.each([
    ['2h', 120], ['1.5h', 90], ['1,5h', 90], ['1h30', 90], ['1h30m', 90], ['45m', 45], ['90m', 90], ['30min', 30],
  ])('%s → %i', (token, minutes) => expect(parseDuration(token)).toBe(minutes))

  it('recognizes non-durations', () => {
    expect(parseDuration('login')).toBeUndefined()
    expect(parseDuration('9:00')).toBeUndefined()
  })

  it('does not trim: a token with surrounding spaces is no duration', () => {
    expect(parseDuration(' 1h ')).toBeUndefined()
  })
})

describe('normalizeForComparison', () => {
  it('lowercases with the German locale and keeps surrounding spaces', () => {
    expect(normalizeForComparison('GB-11 ÄÖÜ')).toBe('gb-11 äöü')
    expect(normalizeForComparison(' Ab ')).toBe(' ab ')
  })
})

describe('parseTimeRange', () => {
  it('parses time ranges', () => {
    expect(parseTimeRange('9:00-10:30')).toEqual({ start: 540, end: 630 })
    expect(parseTimeRange('9-10')).toEqual({ start: 540, end: 600 })
    expect(parseTimeRange('14:15–15')).toEqual({ start: 855, end: 900 })
    expect(parseTimeRange('2h')).toBeUndefined()
  })
})

describe('parseDateToken', () => {
  it('relative days', () => {
    expect(parseDateToken('morgen', ctx.today, 'forward')).toBe('2026-09-29')
    expect(parseDateToken('gestern', ctx.today, 'backward')).toBe('2026-09-27')
    expect(parseDateToken('2026-10-01', ctx.today, 'forward')).toBe('2026-10-01')
  })

  it('weekdays: planning looks forward, booking looks back', () => {
    expect(parseDateToken('di', ctx.today, 'forward')).toBe('2026-09-29')
    expect(parseDateToken('mo', ctx.today, 'forward')).toBe('2026-10-05') // next Monday, not today
    expect(parseDateToken('mo', ctx.today, 'backward')).toBe('2026-09-28') // today
    expect(parseDateToken('fr', ctx.today, 'backward')).toBe('2026-09-25')
  })

  it('ignores other words', () => {
    expect(parseDateToken('review', ctx.today, 'forward')).toBeUndefined()
  })
})

describe('parseQuickInput - examples', () => {
  it('2h PROJ-123 Review -> booked on task with note', () => {
    expect(parse('2h PROJ-123 Review')).toEqual({
      type: 'block', kind: 'work', status: 'booked', date: '2026-09-28',
      time: { duration: 120 },
      assignment: { type: 'task', taskId: 10, accountId: 1 },
      note: 'Review',
    })
  })

  it('key is case-insensitive', () => {
    expect(parse('2h proj-123')).toMatchObject({ assignment: { type: 'task', taskId: 10 } })
  })

  it('2h login -> fuzzy match on open task title', () => {
    expect(parse('2h login')).toMatchObject({ assignment: { type: 'task', taskId: 10 } })
  })

  it('fuzzy: remaining text becomes the note', () => {
    expect(parse('1h login code review')).toMatchObject({ assignment: { taskId: 10 }, note: 'code review' })
  })

  it('ambiguous -> candidates', () => {
    const r = parse('1h log')
    expect(r).toMatchObject({ type: 'block', candidates: [{ taskId: 10 }, { taskId: 11 }] })
    expect(r).not.toHaveProperty('assignment', expect.anything())
  })

  it('2h Neue Idee @apollo -> new task in the account', () => {
    expect(parse('2h Neue Idee @apollo')).toMatchObject({
      assignment: { type: 'newTask', title: 'Neue Idee', accountId: 1 },
    })
  })

  it('@account narrows the fuzzy match to the account', () => {
    expect(parse('2h login @apollo')).toMatchObject({ assignment: { type: 'task', taskId: 10 } })
    expect(parse('2h server @apollo')).toMatchObject({ assignment: { type: 'newTask', title: 'server', accountId: 1 } })
  })

  it('only @account -> directly on the account', () => {
    expect(parse('1h @wartung')).toMatchObject({ assignment: { type: 'account', accountId: 2 } })
  })

  it('9:00-10:30 mtg -> fixed time on account via alias', () => {
    expect(parse('9:00-10:30 mtg')).toEqual({
      type: 'block', kind: 'work', status: 'booked', date: '2026-09-28',
      time: { start: 540, end: 630 },
      assignment: { type: 'account', accountId: 3 },
      note: undefined,
    })
  })

  it('fuzzy match on account name', () => {
    expect(parse('30m wartung')).toMatchObject({ assignment: { type: 'account', accountId: 2 } })
  })

  it('p 30m -> break', () => {
    expect(parse('p 30m')).toEqual({
      type: 'block', kind: 'break', status: 'booked', date: '2026-09-28', time: { duration: 30 }, note: undefined,
    })
  })

  it('plan 5h PROJ-123 morgen -> planned for tomorrow', () => {
    expect(parse('plan 5h PROJ-123 morgen')).toMatchObject({
      status: 'planned', date: '2026-09-29', time: { duration: 300 }, assignment: { taskId: 10 },
    })
  })

  it('plan with weekday and ISO date', () => {
    expect(parse('plan 2h PROJ-123 fr')).toMatchObject({ date: '2026-10-02' })
    expect(parse('plan 2h PROJ-123 2026-10-07')).toMatchObject({ date: '2026-10-07' })
  })

  it('booking for yesterday', () => {
    expect(parse('2h PROJ-123 gestern')).toMatchObject({ status: 'booked', date: '2026-09-27' })
  })

  it('without a date the displayed day applies, relative dates stay relative to today', () => {
    const other = { ...ctx, standardDate: '2026-09-24' }
    expect(parseQuickInput('2h PROJ-123', other)).toMatchObject({ date: '2026-09-24' })
    expect(parseQuickInput('2h PROJ-123 gestern', other)).toMatchObject({ date: '2026-09-27' })
  })
})

describe('parseQuickInput - reminder, daily, waiting-for', () => {
  it('t renew certificate -> reminder', () => {
    expect(parse('t Zertifikat verlängern')).toEqual({ type: 'todo', todoKind: 'reminder', text: 'Zertifikat verlängern' })
  })

  it('t ... bis fr -> reminder with due date', () => {
    expect(parse('t Zertifikat verlängern bis fr')).toEqual({ type: 'todo', todoKind: 'reminder', text: 'Zertifikat verlängern', cutoffDate: '2026-10-02' })
  })

  it('d Deployment-Freeze ansprechen -> daily topic, "bis" stays text', () => {
    expect(parse('d Deployment-Freeze ansprechen')).toEqual({ type: 'todo', todoKind: 'daily_topic', text: 'Deployment-Freeze ansprechen' })
    expect(parse('d warten bis morgen')).toMatchObject({ text: 'warten bis morgen' })
  })

  it('w Tim: PR-Review Login -> waiting-for with who', () => {
    expect(parse('w Tim: PR-Review Login')).toEqual({ type: 'todo', todoKind: 'waiting_for', text: 'PR-Review Login', person: 'Tim' })
  })

  it('w ... bis fr / bis 2026-10-02 -> follow-up date', () => {
    expect(parse('w Tim: PR-Review Login bis fr')).toMatchObject({ person: 'Tim', text: 'PR-Review Login', cutoffDate: '2026-10-02' })
    expect(parse('w Tim: PR-Review bis 2026-10-07')).toMatchObject({ cutoffDate: '2026-10-07' })
  })

  it('w without colon -> text only', () => {
    expect(parse('w Rückmeldung Kunde')).toEqual({ type: 'todo', todoKind: 'waiting_for', text: 'Rückmeldung Kunde' })
  })

  it('"bis" without a valid date stays part of the text', () => {
    expect(parse('t Doku lesen bis Seite')).toMatchObject({ text: 'Doku lesen bis Seite' })
  })

  it('prefix without text -> error', () => {
    expect(parse('t')).toMatchObject({ type: 'error' })
    expect(parse('w Tim:')).toMatchObject({ type: 'error' })
  })

  it('prefix is case-insensitive', () => {
    expect(parse('T Merker')).toMatchObject({ type: 'todo', todoKind: 'reminder' })
  })
})

describe('parseQuickInput - note', () => {
  it('n Architektur-Idee -> new note with title', () => {
    expect(parse('n Architektur-Idee')).toEqual({ type: 'note', title: 'Architektur-Idee' })
    expect(parse('N Idee für später')).toEqual({ type: 'note', title: 'Idee für später' })
  })

  it('n without title -> error', () => {
    expect(parse('n')).toMatchObject({ type: 'error' })
  })

  it('nm / np / ni set the kind', () => {
    expect(parse('nm Wochenmeeting')).toEqual({ type: 'note', kind: 'meeting', title: 'Wochenmeeting' })
    expect(parse('NP Cache läuft voll')).toEqual({ type: 'note', kind: 'problem', title: 'Cache läuft voll' })
    expect(parse('ni Port ist 8080')).toEqual({ type: 'note', kind: 'info', title: 'Port ist 8080' })
  })

  it('an exact task key links the task; the rest is the title', () => {
    expect(parse('np PROJ-123 Cache läuft voll')).toEqual({ type: 'note', kind: 'problem', taskId: 10, title: 'Cache läuft voll' })
    expect(parse('nm proj-124 Abstimmung')).toMatchObject({ kind: 'meeting', taskId: 11, title: 'Abstimmung' })
  })

  it('a key without further words uses the task title', () => {
    expect(parse('ni PROJ-123')).toEqual({ type: 'note', kind: 'info', taskId: 10, title: 'Login-Refactoring' })
  })

  it('a first word that is no key stays in the title', () => {
    expect(parse('np Login läuft nicht')).toEqual({ type: 'note', kind: 'problem', title: 'Login läuft nicht' })
  })

  it('n never matches a key and sets no kind', () => {
    expect(parse('n PROJ-123 foo')).toEqual({ type: 'note', title: 'PROJ-123 foo' })
  })

  it('kind prefix without title and key -> Titel fehlt', () => {
    expect(parse('np')).toEqual({ type: 'error', message: 'Titel fehlt' })
  })
})

describe('parseQuickInput - filters and errors', () => {
  it('closed tasks and archived accounts are not matched by fuzzy match or alias', () => {
    expect(parse('1h alt')).toMatchObject({ type: 'error' })
    expect(parse('1h altprojekt')).toMatchObject({ type: 'error' })
  })

  it('exact key also matches closed tasks', () => {
    expect(parse('1h OLD-1')).toMatchObject({ assignment: { taskId: 13 } })
  })

  it('no match -> error with a hint about @account', () => {
    expect(parse('2h Neue Idee')).toMatchObject({ type: 'error', message: expect.stringContaining('@konto') })
  })

  it('unknown @account', () => {
    expect(parse('2h x @gibtsnicht')).toMatchObject({ type: 'error' })
  })

  it('grid and ranges are validated', () => {
    expect(parse('1h10 PROJ-123')).toMatchObject({ type: 'error' })
    expect(parse('9:10-10:00 mtg')).toMatchObject({ type: 'error' })
    expect(parse('11:00-10:00 mtg')).toMatchObject({ type: 'error' })
  })

  it('booking in the future is not allowed', () => {
    expect(parse('2h PROJ-123 morgen')).toMatchObject({ type: 'error' })
  })

  it('prefix without duration is an error', () => {
    expect(parse('p')).toMatchObject({ type: 'error' })
    expect(parse('plan PROJ-123')).toMatchObject({ type: 'error' })
  })

  it('without duration or prefix -> search', () => {
    expect(parse('login')).toEqual({ type: 'search', text: 'login' })
    expect(parse('   ')).toEqual({ type: 'empty' })
  })
})
