// Dev test data: empties the DB (DATABASE_URL) and fills it with ~2 months of realistic data around "today".
// Usage: pnpm db:seed
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const url = process.env.DATABASE_URL || 'file:./data/daybreak.db'
if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
const client = createClient({ url })
await migrate(drizzle(client), { migrationsFolder: 'drizzle' })

// --- Date helpers (Europe/Berlin, 'YYYY-MM-DD') ---
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
const addDays = (d, n) => {
  const t = new Date(`${d}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const weekday = d => new Date(`${d}T12:00:00Z`).getUTCDay() || 7 // 1 = Mon ... 7 = Sun
const iso = (d, min = 540) => `${d}T${String(Math.floor(min / 60) - 2).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00.000Z`

// Deterministic randomness so every seed looks the same
let seed = 42
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const choice = list => list[Math.floor(random() * list.length)]
const grid = (min, max) => min + 15 * Math.floor(random() * ((max - min) / 15 + 1))

const start = addDays(today, -56) // balance start: 8 weeks back
const monday = d => addDays(d, 1 - weekday(d))

// --- Days (vacation, sick, ...) relative to today ---
const dayRows = []
const setDay = (date, type, extra = {}) => dayRows.push({ date, type, target_override: null, note: null, blocker: 0, ...extra })
const vacationFrom = monday(addDays(today, -35))
for (let i = 0; i < 5; i++) setDay(addDays(vacationFrom, i), 'vacation', i === 0 ? { note: 'Ostsee' } : {})
setDay(addDays(monday(today), -12), 'sick', { note: 'Erkältung' })
setDay(addDays(monday(today), -3), 'flex_day')
setDay(addDays(monday(today), -10), 'half_vacation', { note: 'Arzttermin' })
setDay(addDays(monday(today), -6), 'work', { target_override: 360, note: 'Teamevent ab 15 Uhr' })
const nextVacation = addDays(monday(today), 14)
for (let i = 0; i < 5; i++) setDay(addDays(nextVacation, i), 'vacation', i === 0 ? { note: 'Herbsturlaub' } : {})
const release = addDays(monday(today), 28)
for (let i = 0; i < 5; i++) setDay(addDays(release, i), 'work', { blocker: 1, note: i === 0 ? 'Release-Woche' : null })
const year = today.slice(0, 4)
for (const d of ['12-28', '12-29', '12-30']) setDay(`${year}-${d}`, 'vacation')
const dayType = Object.fromEntries(dayRows.map(t => [t.date, t]))

// --- Wipe ---
// Order respects foreign keys
await client.batch([
  ...['block', 'template_exception', 'template', 'todo', 'note', 'task', 'account', 'day', 'vacation_entitlement', 'settings']
    .map(t => `DELETE FROM ${t}`),
  'DELETE FROM sqlite_sequence',
], 'write')

const insert = async (table, rows) => {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  await client.batch(rows.map(z => ({
    sql: `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    args: columns.map(s => z[s] ?? null),
  })), 'write')
}

// --- Accounts (ids 1...) ---
const accounts = [
  { name: 'GALAXYBOT', color: 'lavender', aliases: '["gb","galaxy"]', status: 'active' },
  { name: 'Kundenportal', color: 'sky', aliases: '["kp","portal"]', status: 'active' },
  { name: 'Firmenmeeting', color: 'butter', aliases: '["meeting","fm"]', status: 'active' },
  { name: 'Weiterbildung', color: 'mint', aliases: '["wb"]', status: 'active' },
  { name: 'Support', color: 'peach', aliases: '["sup"]', status: 'active' },
  { name: 'Altprojekt Lager', color: 'sage', aliases: '[]', status: 'archived' },
]
await insert('account', accounts.map(k => ({ ...k, created_at: iso(start) })))
const K = { gb: 1, kp: 2, fm: 3, wb: 4, sup: 5, alt: 6 }

// --- Tasks (ids 1...) with an activity window for the block distribution ---
const tasks = [
  { account_id: K.gb, key: 'GB-101', title: 'Intent-Erkennung überarbeiten', estimate_min: 1200, from: -56, to: -30 },
  { account_id: K.gb, key: 'GB-114', title: 'Antwort-Caching mit Redis', estimate_min: 900, from: -40, to: 5 },
  { account_id: K.gb, key: 'GB-120', title: 'Monitoring-Dashboard', estimate_min: 600, from: -20, to: 20 },
  { account_id: K.gb, key: 'GB-127', title: 'Tokenlimit pro Mandant', estimate_min: 480, from: -3, to: 30 },
  { account_id: K.kp, key: 'KP-42', title: 'Login mit SSO', estimate_min: 960, from: -56, to: -25 },
  { account_id: K.kp, key: 'KP-57', title: 'Rechnungsübersicht als PDF', estimate_min: 720, from: -28, to: 10 },
  { account_id: K.kp, key: 'KP-61', title: 'Barrierefreiheit Formulare', estimate_min: null, from: -10, to: 30 },
  { account_id: K.wb, key: null, title: 'Rust-Grundlagen', estimate_min: 1200, from: -56, to: 30 },
  { account_id: K.sup, key: 'SUP-8', title: 'Tickets 3rd Level', estimate_min: null, from: -56, to: 30 },
  { account_id: K.alt, key: 'LAG-3', title: 'Datenmigration Altsystem', estimate_min: 300, from: -56, to: -45 },
]
await insert('task', tasks.map(({ from, to, ...a }) => ({
  ...a,
  status: to < 0 ? 'closed' : 'open',
  created_at: iso(addDays(today, from - 3)),
  closed_at: to < 0 ? iso(addDays(today, to), 960) : null,
})))
const weights = [3, 4, 3, 2, 3, 3, 2, 1, 1, 2] // frequency per task
const tasksOn = (d) => {
  const offset = Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 864e5)
  return tasks.flatMap((a, i) => (offset >= a.from && offset <= a.to ? Array(weights[i]).fill(i + 1) : []))
}

// --- Templates ---
await insert('template', [
  { name: 'Daily', task_id: null, account_id: K.gb, start: 570, end: 585, weekdays: '[1,2,3,4,5]', interval_weeks: 1, valid_from: start, valid_until: null, active: 1 },
  { name: 'Jour fixe', task_id: null, account_id: K.fm, start: 840, end: 900, weekdays: '[1]', interval_weeks: 2, valid_from: monday(start), valid_until: null, active: 1 },
  { name: 'Lernzeit', task_id: 8, account_id: K.wb, start: 900, end: 960, weekdays: '[5]', interval_weeks: 1, valid_from: start, valid_until: null, active: 1 },
])
await insert('template_exception', [{ template_id: 1, date: addDays(monday(today), -7) }])

// --- Blocks ---
const notes = ['Code-Review', 'Pairing', 'Bugfix nach Rückfrage', 'Tests ergänzt', 'Abstimmung mit PO', null, null, null, null]
const blocks = []
const block = (date, s, e, status, extra = {}) => blocks.push({ date, start: s, end: e, kind: 'work', status, task_id: null, account_id: null, note: null, template_id: null, ...extra })

// Fills [from, to) with work blocks; fixed appointments (templates) are left out
function fill(date, from, to, status, fixed) {
  let t = from
  const pool = tasksOn(date)
  for (const f of [...fixed.filter(f => f.start >= from && f.start < to), { start: to, end: to }].sort((a, b) => a.start - b.start)) {
    while (t < f.start) {
      const e = Math.min(f.start, t + grid(45, 150))
      if (random() < 0.1) block(date, t, e, status, { account_id: choice([K.fm, K.sup]) })
      else block(date, t, e, status, { task_id: choice(pool), note: choice(notes) })
      t = e
    }
    t = Math.max(t, f.end)
  }
}

/** Books the template appointments of the day that end by `bisMin`; later ones are materialized by the app itself. */
function fixedAppointments(date, status, toMin) {
  const weekdayNumber = weekday(date)
  const fixed = []
  const week = Math.round((new Date(`${monday(date)}T12:00:00Z`) - new Date(`${monday(start)}T12:00:00Z`)) / (7 * 864e5))
  if (date !== addDays(monday(today), -7)) fixed.push({ start: 570, end: 585, template_id: 1, account_id: K.gb })
  if (weekdayNumber === 1 && week % 2 === 0) fixed.push({ start: 840, end: 900, template_id: 2, account_id: K.fm })
  if (weekdayNumber === 5) fixed.push({ start: 900, end: 960, template_id: 3, task_id: 8 })
  const due = fixed.filter(f => f.end <= toMin)
  for (const { start: s, end: e, ...carryover } of due) block(date, s, e, status, carryover)
  return due
}

for (let d = start; d <= addDays(today, 7); d = addDays(d, 1)) {
  const dayTypeValue = dayType[d]?.type
  if (weekday(d) > 5 || ['vacation', 'sick', 'flex_day'].includes(dayTypeValue)) continue
  if (d > today) {
    // Future: only a few planned blocks; the app materializes templates itself
    if (d > addDays(today, 3)) continue
    const pool = tasksOn(d)
    block(d, 600, 720, 'planned', { task_id: choice(pool) })
    block(d, 765, 840, 'planned', { task_id: choice(pool) })
    continue
  }
  const start = grid(465, 525)
  if (d === today) {
    const fixed = fixedAppointments(d, 'booked', 600)
    fill(d, start, 660, 'booked', fixed)
    blocks.push({ date: d, start: 720, end: 765, kind: 'break', status: 'planned', task_id: null, account_id: null, note: null, template_id: null })
    fill(d, 660, 720, 'planned', [])
    fill(d, 765, 1005, 'planned', [])
    continue
  }
  const targetMinutes = dayTypeValue === 'half_vacation' ? 240 : (dayType[d]?.target_override ?? 480)
  const endMinute = start + targetMinutes + 45 + grid(-45, 75)
  const fixed = fixedAppointments(d, 'booked', endMinute)
  if (endMinute <= 720) {
    fill(d, start, endMinute, 'booked', fixed)
    continue
  }
  const breakStart = grid(705, 750)
  fill(d, start, breakStart, 'booked', fixed.filter(f => f.start < breakStart))
  blocks.push({ date: d, start: breakStart, end: breakStart + 45, kind: 'break', status: 'booked', task_id: null, account_id: null, note: null, template_id: null })
  fill(d, breakStart + 45, endMinute, 'booked', fixed.filter(f => f.start >= breakStart))
}
// Like resolveAssignment: task blocks also carry the account of their task
await insert('block', blocks.map(b => ({
  ...b,
  account_id: b.task_id ? tasks[b.task_id - 1].account_id : b.account_id,
  created_at: iso(b.date, b.start),
})))

await insert('day', dayRows)

// --- Todos ---
await insert('todo', [
  { kind: 'reminder', text: 'Reisekosten September einreichen', due_date: addDays(today, -2), sort_order: 0 },
  { kind: 'reminder', text: 'Zertifikat für Staging erneuern', due_date: today, task_id: 3, sort_order: 1 },
  { kind: 'reminder', text: 'Feedbackgespräch vorbereiten', due_date: addDays(today, 5), sort_order: 2 },
  { kind: 'reminder', text: 'Doku zu Caching-Strategie schreiben', task_id: 2, sort_order: 3 },
  { kind: 'reminder', text: 'Laptop-Tausch beantragen', sort_order: 4, done_at: iso(addDays(today, -4)) },
  { kind: 'daily_topic', text: 'Blocker: Staging-DB voll', account_id: K.gb, sort_order: 0 },
  { kind: 'daily_topic', text: 'PDF-Rendering: Library-Entscheidung', task_id: 6, sort_order: 1 },
  { kind: 'daily_topic', text: 'Urlaubsvertretung klären', sort_order: 2 },
  { kind: 'daily_topic', text: 'Review GB-114 offen', task_id: 2, sort_order: 3, done_at: iso(addDays(today, -1)) },
  { kind: 'waiting_for', text: 'Freigabe Rechnungslayout', person: 'Fachbereich Finanzen', follow_up_date: addDays(today, -1), task_id: 6, sort_order: 0 },
  { kind: 'waiting_for', text: 'SSO-Zugangsdaten Testumgebung', person: 'IT-Betrieb', follow_up_date: addDays(today, 3), account_id: K.kp, sort_order: 1 },
  { kind: 'waiting_for', text: 'Budget für Rust-Schulung', person: 'Teamleitung', follow_up_date: addDays(today, 10), task_id: 8, sort_order: 2 },
].map(t => ({ person: null, follow_up_date: null, task_id: null, account_id: null, due_date: null, done_at: null, created_at: iso(addDays(today, -7)), ...t })))

// --- Notes ---
await insert('note', [
  { title: 'Deployment-Checkliste', kind: 'info', content: '## Vor dem Release\n\n- [ ] Migrationen geprüft\n- [ ] Feature-Flags gesetzt\n- [ ] Changelog aktualisiert\n\n## Danach\n\n1. Smoke-Tests\n2. Monitoring 30 min beobachten', tags: '["release","checkliste"]', account_id: K.gb, pinned: 1, daysAgo: -20 },
  { title: 'Redis-Konfiguration', kind: 'info', content: 'TTL **300 s** für Antworten, Invalidierung per Pub/Sub.\n\n```\nmaxmemory-policy allkeys-lru\n```', tags: '["redis","technik"]', task_id: 2, pinned: 1, daysAgo: -5 },
  { title: 'Retro-Notizen Sprint 18', kind: 'meeting', content: '**Gut:** Pairing, schnellere Reviews\n\n**Verbessern:** Tickets kleiner schneiden, Daily pünktlich beenden', tags: '["retro"]', account_id: K.gb, pinned: 0, daysAgo: -12 },
  { title: 'SSO-Flow', kind: 'problem', content: '1. Redirect zum IdP\n2. Callback mit Code\n3. Token-Tausch serverseitig\n\n> Refresh-Token nie im Browser speichern.', tags: '["sso","technik"]', task_id: 5, pinned: 0, daysAgo: -40 },
  { title: 'Ideen Weiterbildung', kind: 'meeting', content: '- Rust Ownership-Kapitel\n- Vortrag über Observability\n- Konferenz im Frühjahr', tags: '["lernen"]', account_id: K.wb, pinned: 0, daysAgo: -2 },
  { title: 'Telefonnummern', content: 'IT-Hotline: 1234\nEmpfang: 1000', tags: '[]', pinned: 0, daysAgo: -50 },
].map(({ daysAgo: t, ...n }) => ({ kind: null, task_id: null, account_id: null, ...n, created_at: iso(addDays(today, t - 3)), updated_at: iso(addDays(today, t), 900) })))

// --- Vacation entitlement and settings ---
await insert('vacation_entitlement', [
  { year: Number(year), kind: 'base', label: 'Grundanspruch', days: 30 },
  { year: Number(year), kind: 'extra', label: 'Sonderurlaub Umzug', days: 1 },
  { year: Number(year), kind: 'carryover', label: `Resturlaub ${Number(year) - 1}`, days: 4.5 },
])
await insert('settings', Object.entries({
  vacationPrefilled: true,
  balanceStart: { date: start, balanceMin: 135 },
  targetPerDayMin: 480,
  workdays: [1, 2, 3, 4, 5],
  federalState: 'BW',
  workStart: 480,
  timelineFrom: 420,
  timelineTo: 1140,
  vacationNoticeDays: 21,
  vacationNoticeText: 'Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.',
}).map(([key, value]) => ({ key, value: JSON.stringify(value) })))

console.log(`Seed done (${url}): ${accounts.length} accounts, ${tasks.length} tasks, ${blocks.length} blocks, ${dayRows.length} days`)
