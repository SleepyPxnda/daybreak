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
const setDay = (date, type, extra = {}) => dayRows.push({ datum: date, typ: type, soll_override: null, notiz: null, blocker: 0, ...extra })
const vacationFrom = monday(addDays(today, -35))
for (let i = 0; i < 5; i++) setDay(addDays(vacationFrom, i), 'urlaub', i === 0 ? { notiz: 'Ostsee' } : {})
setDay(addDays(monday(today), -12), 'krank', { notiz: 'Erkältung' })
setDay(addDays(monday(today), -3), 'gleittag')
setDay(addDays(monday(today), -10), 'halb_urlaub', { notiz: 'Arzttermin' })
setDay(addDays(monday(today), -6), 'arbeit', { soll_override: 360, notiz: 'Teamevent ab 15 Uhr' })
const nextVacation = addDays(monday(today), 14)
for (let i = 0; i < 5; i++) setDay(addDays(nextVacation, i), 'urlaub', i === 0 ? { notiz: 'Herbsturlaub' } : {})
const release = addDays(monday(today), 28)
for (let i = 0; i < 5; i++) setDay(addDays(release, i), 'arbeit', { blocker: 1, notiz: i === 0 ? 'Release-Woche' : null })
const year = today.slice(0, 4)
for (const d of ['12-28', '12-29', '12-30']) setDay(`${year}-${d}`, 'urlaub')
const dayType = Object.fromEntries(dayRows.map(t => [t.datum, t]))

// --- Wipe ---
// Order respects foreign keys
await client.batch([
  ...['block', 'vorlage_ausnahme', 'vorlage', 'todo', 'notiz', 'aufgabe', 'konto', 'tag', 'urlaubsanspruch', 'settings']
    .map(t => `DELETE FROM ${t}`),
  'DELETE FROM sqlite_sequence',
], 'write')

const insert = async (table, rows) => {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  await client.batch(rows.map(z => ({
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    args: columns.map(s => z[s] ?? null),
  })), 'write')
}

// --- Accounts (ids 1...) ---
const accounts = [
  { name: 'GALAXYBOT', farbe: 'lavendel', aliase: '["gb","galaxy"]', status: 'aktiv' },
  { name: 'Kundenportal', farbe: 'himmel', aliase: '["kp","portal"]', status: 'aktiv' },
  { name: 'Firmenmeeting', farbe: 'butter', aliase: '["meeting","fm"]', status: 'aktiv' },
  { name: 'Weiterbildung', farbe: 'mint', aliase: '["wb"]', status: 'aktiv' },
  { name: 'Support', farbe: 'pfirsich', aliase: '["sup"]', status: 'aktiv' },
  { name: 'Altprojekt Lager', farbe: 'salbei', aliase: '[]', status: 'archiviert' },
]
await insert('konto', accounts.map(k => ({ ...k, erstellt_am: iso(start) })))
const K = { gb: 1, kp: 2, fm: 3, wb: 4, sup: 5, alt: 6 }

// --- Tasks (ids 1...) with an activity window for the block distribution ---
const tasks = [
  { konto_id: K.gb, key: 'GB-101', titel: 'Intent-Erkennung überarbeiten', schaetzung_min: 1200, from: -56, to: -30 },
  { konto_id: K.gb, key: 'GB-114', titel: 'Antwort-Caching mit Redis', schaetzung_min: 900, from: -40, to: 5 },
  { konto_id: K.gb, key: 'GB-120', titel: 'Monitoring-Dashboard', schaetzung_min: 600, from: -20, to: 20 },
  { konto_id: K.gb, key: 'GB-127', titel: 'Tokenlimit pro Mandant', schaetzung_min: 480, from: -3, to: 30 },
  { konto_id: K.kp, key: 'KP-42', titel: 'Login mit SSO', schaetzung_min: 960, from: -56, to: -25 },
  { konto_id: K.kp, key: 'KP-57', titel: 'Rechnungsübersicht als PDF', schaetzung_min: 720, from: -28, to: 10 },
  { konto_id: K.kp, key: 'KP-61', titel: 'Barrierefreiheit Formulare', schaetzung_min: null, from: -10, to: 30 },
  { konto_id: K.wb, key: null, titel: 'Rust-Grundlagen', schaetzung_min: 1200, from: -56, to: 30 },
  { konto_id: K.sup, key: 'SUP-8', titel: 'Tickets 3rd Level', schaetzung_min: null, from: -56, to: 30 },
  { konto_id: K.alt, key: 'LAG-3', titel: 'Datenmigration Altsystem', schaetzung_min: 300, from: -56, to: -45 },
]
await insert('aufgabe', tasks.map(({ from, to, ...a }) => ({
  ...a,
  status: to < 0 ? 'abgeschlossen' : 'offen',
  erstellt_am: iso(addDays(today, from - 3)),
  abgeschlossen_am: to < 0 ? iso(addDays(today, to), 960) : null,
})))
const weights = [3, 4, 3, 2, 3, 3, 2, 1, 1, 2] // frequency per task
const tasksOn = (d) => {
  const offset = Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 864e5)
  return tasks.flatMap((a, i) => (offset >= a.from && offset <= a.to ? Array(weights[i]).fill(i + 1) : []))
}

// --- Templates ---
await insert('vorlage', [
  { name: 'Daily', aufgabe_id: null, konto_id: K.gb, start: 570, ende: 585, wochentage: '[1,2,3,4,5]', intervall_wochen: 1, gueltig_ab: start, gueltig_bis: null, aktiv: 1 },
  { name: 'Jour fixe', aufgabe_id: null, konto_id: K.fm, start: 840, ende: 900, wochentage: '[1]', intervall_wochen: 2, gueltig_ab: monday(start), gueltig_bis: null, aktiv: 1 },
  { name: 'Lernzeit', aufgabe_id: 8, konto_id: K.wb, start: 900, ende: 960, wochentage: '[5]', intervall_wochen: 1, gueltig_ab: start, gueltig_bis: null, aktiv: 1 },
])
await insert('vorlage_ausnahme', [{ vorlage_id: 1, datum: addDays(monday(today), -7) }])

// --- Blocks ---
const notes = ['Code-Review', 'Pairing', 'Bugfix nach Rückfrage', 'Tests ergänzt', 'Abstimmung mit PO', null, null, null, null]
const blocks = []
const block = (date, s, e, status, extra = {}) => blocks.push({ datum: date, start: s, ende: e, kind: 'arbeit', status, aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null, ...extra })

// Fills [from, to) with work blocks; fixed appointments (templates) are left out
function fill(date, from, to, status, fixed) {
  let t = from
  const pool = tasksOn(date)
  for (const f of [...fixed.filter(f => f.start >= from && f.start < to), { start: to, ende: to }].sort((a, b) => a.start - b.start)) {
    while (t < f.start) {
      const e = Math.min(f.start, t + grid(45, 150))
      if (random() < 0.1) block(date, t, e, status, { konto_id: choice([K.fm, K.sup]) })
      else block(date, t, e, status, { aufgabe_id: choice(pool), notiz: choice(notes) })
      t = e
    }
    t = Math.max(t, f.ende)
  }
}

/** Books the template appointments of the day that end by `bisMin`; later ones are materialized by the app itself. */
function fixedAppointments(date, status, toMin) {
  const weekdayNumber = weekday(date)
  const fixed = []
  const week = Math.round((new Date(`${monday(date)}T12:00:00Z`) - new Date(`${monday(start)}T12:00:00Z`)) / (7 * 864e5))
  if (date !== addDays(monday(today), -7)) fixed.push({ start: 570, ende: 585, vorlage_id: 1, konto_id: K.gb })
  if (weekdayNumber === 1 && week % 2 === 0) fixed.push({ start: 840, ende: 900, vorlage_id: 2, konto_id: K.fm })
  if (weekdayNumber === 5) fixed.push({ start: 900, ende: 960, vorlage_id: 3, aufgabe_id: 8 })
  const due = fixed.filter(f => f.ende <= toMin)
  for (const { start: s, ende: e, ...carryover } of due) block(date, s, e, status, carryover)
  return due
}

for (let d = start; d <= addDays(today, 7); d = addDays(d, 1)) {
  const dayTypeValue = dayType[d]?.typ
  if (weekday(d) > 5 || ['urlaub', 'krank', 'gleittag'].includes(dayTypeValue)) continue
  if (d > today) {
    // Future: only a few planned blocks; the app materializes templates itself
    if (d > addDays(today, 3)) continue
    const pool = tasksOn(d)
    block(d, 600, 720, 'geplant', { aufgabe_id: choice(pool) })
    block(d, 765, 840, 'geplant', { aufgabe_id: choice(pool) })
    continue
  }
  const start = grid(465, 525)
  if (d === today) {
    const fixed = fixedAppointments(d, 'gebucht', 600)
    fill(d, start, 660, 'gebucht', fixed)
    blocks.push({ datum: d, start: 720, ende: 765, kind: 'pause', status: 'geplant', aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null })
    fill(d, 660, 720, 'geplant', [])
    fill(d, 765, 1005, 'geplant', [])
    continue
  }
  const targetMinutes = dayTypeValue === 'halb_urlaub' ? 240 : (dayType[d]?.soll_override ?? 480)
  const endMinute = start + targetMinutes + 45 + grid(-45, 75)
  const fixed = fixedAppointments(d, 'gebucht', endMinute)
  if (endMinute <= 720) {
    fill(d, start, endMinute, 'gebucht', fixed)
    continue
  }
  const breakStart = grid(705, 750)
  fill(d, start, breakStart, 'gebucht', fixed.filter(f => f.start < breakStart))
  blocks.push({ datum: d, start: breakStart, ende: breakStart + 45, kind: 'pause', status: 'gebucht', aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null })
  fill(d, breakStart + 45, endMinute, 'gebucht', fixed.filter(f => f.start >= breakStart))
}
// Like resolveAssignment: task blocks also carry the account of their task
await insert('block', blocks.map(b => ({
  ...b,
  konto_id: b.aufgabe_id ? tasks[b.aufgabe_id - 1].konto_id : b.konto_id,
  erstellt_am: iso(b.datum, b.start),
})))

await insert('tag', dayRows)

// --- Todos ---
await insert('todo', [
  { art: 'merker', text: 'Reisekosten September einreichen', faellig_am: addDays(today, -2), sortierung: 0 },
  { art: 'merker', text: 'Zertifikat für Staging erneuern', faellig_am: today, aufgabe_id: 3, sortierung: 1 },
  { art: 'merker', text: 'Feedbackgespräch vorbereiten', faellig_am: addDays(today, 5), sortierung: 2 },
  { art: 'merker', text: 'Doku zu Caching-Strategie schreiben', aufgabe_id: 2, sortierung: 3 },
  { art: 'merker', text: 'Laptop-Tausch beantragen', sortierung: 4, erledigt_am: iso(addDays(today, -4)) },
  { art: 'daily', text: 'Blocker: Staging-DB voll', konto_id: K.gb, sortierung: 0 },
  { art: 'daily', text: 'PDF-Rendering: Library-Entscheidung', aufgabe_id: 6, sortierung: 1 },
  { art: 'daily', text: 'Urlaubsvertretung klären', sortierung: 2 },
  { art: 'daily', text: 'Review GB-114 offen', aufgabe_id: 2, sortierung: 3, erledigt_am: iso(addDays(today, -1)) },
  { art: 'warten', text: 'Freigabe Rechnungslayout', wer: 'Fachbereich Finanzen', nachfassen_am: addDays(today, -1), aufgabe_id: 6, sortierung: 0 },
  { art: 'warten', text: 'SSO-Zugangsdaten Testumgebung', wer: 'IT-Betrieb', nachfassen_am: addDays(today, 3), konto_id: K.kp, sortierung: 1 },
  { art: 'warten', text: 'Budget für Rust-Schulung', wer: 'Teamleitung', nachfassen_am: addDays(today, 10), aufgabe_id: 8, sortierung: 2 },
].map(t => ({ wer: null, nachfassen_am: null, aufgabe_id: null, konto_id: null, faellig_am: null, erledigt_am: null, erstellt_am: iso(addDays(today, -7)), ...t })))

// --- Notes ---
await insert('notiz', [
  { titel: 'Deployment-Checkliste', inhalt: '## Vor dem Release\n\n- [ ] Migrationen geprüft\n- [ ] Feature-Flags gesetzt\n- [ ] Changelog aktualisiert\n\n## Danach\n\n1. Smoke-Tests\n2. Monitoring 30 min beobachten', tags: '["release","checkliste"]', konto_id: K.gb, angepinnt: 1, daysAgo: -20 },
  { titel: 'Redis-Konfiguration', inhalt: 'TTL **300 s** für Antworten, Invalidierung per Pub/Sub.\n\n```\nmaxmemory-policy allkeys-lru\n```', tags: '["redis","technik"]', aufgabe_id: 2, angepinnt: 1, daysAgo: -5 },
  { titel: 'Retro-Notizen Sprint 18', inhalt: '**Gut:** Pairing, schnellere Reviews\n\n**Verbessern:** Tickets kleiner schneiden, Daily pünktlich beenden', tags: '["retro"]', konto_id: K.gb, angepinnt: 0, daysAgo: -12 },
  { titel: 'SSO-Flow', inhalt: '1. Redirect zum IdP\n2. Callback mit Code\n3. Token-Tausch serverseitig\n\n> Refresh-Token nie im Browser speichern.', tags: '["sso","technik"]', aufgabe_id: 5, angepinnt: 0, daysAgo: -40 },
  { titel: 'Ideen Weiterbildung', inhalt: '- Rust Ownership-Kapitel\n- Vortrag über Observability\n- Konferenz im Frühjahr', tags: '["lernen"]', konto_id: K.wb, angepinnt: 0, daysAgo: -2 },
  { titel: 'Telefonnummern', inhalt: 'IT-Hotline: 1234\nEmpfang: 1000', tags: '[]', angepinnt: 0, daysAgo: -50 },
].map(({ daysAgo: t, ...n }) => ({ aufgabe_id: null, konto_id: null, ...n, erstellt_am: iso(addDays(today, t - 3)), geaendert_am: iso(addDays(today, t), 900) })))

// --- Vacation entitlement and settings ---
await insert('urlaubsanspruch', [
  { jahr: Number(year), art: 'grund', bezeichnung: 'Grundanspruch', tage: 30 },
  { jahr: Number(year), art: 'zusatz', bezeichnung: 'Sonderurlaub Umzug', tage: 1 },
  { jahr: Number(year), art: 'rest', bezeichnung: `Resturlaub ${Number(year) - 1}`, tage: 4.5 },
])
await insert('settings', Object.entries({
  urlaubVorbelegt: true,
  stundenkontoStart: { datum: start, saldoMin: 135 },
  sollProTagMin: 480,
  arbeitstage: [1, 2, 3, 4, 5],
  bundesland: 'BW',
  arbeitsbeginn: 480,
  timelineVon: 420,
  timelineBis: 1140,
  urlaubErinnerungTage: 21,
  urlaubErinnerungText: 'Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.',
}).map(([key, value]) => ({ key, value: JSON.stringify(value) })))

console.log(`Seed done (${url}): ${accounts.length} accounts, ${tasks.length} tasks, ${blocks.length} blocks, ${dayRows.length} days`)
