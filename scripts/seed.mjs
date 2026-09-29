// Dev-Testdaten: leert die DB (DATABASE_URL) und füllt sie mit ~2 Monaten realistischer Daten rund um „heute“.
// Aufruf: pnpm db:seed
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const url = process.env.DATABASE_URL || 'file:./data/daybreak.db'
if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
const client = createClient({ url })
await migrate(drizzle(client), { migrationsFolder: 'drizzle' })

// --- Datumshilfen (Europe/Berlin, 'YYYY-MM-DD') ---
const heute = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
const plusTage = (d, n) => {
  const t = new Date(`${d}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const wochentag = d => new Date(`${d}T12:00:00Z`).getUTCDay() || 7 // 1 = Mo … 7 = So
const iso = (d, min = 540) => `${d}T${String(Math.floor(min / 60) - 2).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00.000Z`

// Deterministischer Zufall, damit jeder Seed gleich aussieht
let seed = 42
const zufall = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const wahl = liste => liste[Math.floor(zufall() * liste.length)]
const raster = (min, max) => min + 15 * Math.floor(zufall() * ((max - min) / 15 + 1))

const start = plusTage(heute, -56) // Stundenkonto-Start: 8 Wochen zurück
const montag = d => plusTage(d, 1 - wochentag(d))

// --- Tage (Urlaub, krank, …) relativ zu heute ---
const tage = []
const setzeTag = (datum, typ, extra = {}) => tage.push({ datum, typ, soll_override: null, notiz: null, blocker: 0, ...extra })
const urlaubVon = montag(plusTage(heute, -35))
for (let i = 0; i < 5; i++) setzeTag(plusTage(urlaubVon, i), 'urlaub', i === 0 ? { notiz: 'Ostsee' } : {})
setzeTag(plusTage(montag(heute), -12), 'krank', { notiz: 'Erkältung' })
setzeTag(plusTage(montag(heute), -3), 'gleittag')
setzeTag(plusTage(montag(heute), -10), 'halb_urlaub', { notiz: 'Arzttermin' })
setzeTag(plusTage(montag(heute), -6), 'arbeit', { soll_override: 360, notiz: 'Teamevent ab 15 Uhr' })
const naechsterUrlaub = plusTage(montag(heute), 14)
for (let i = 0; i < 5; i++) setzeTag(plusTage(naechsterUrlaub, i), 'urlaub', i === 0 ? { notiz: 'Herbsturlaub' } : {})
const release = plusTage(montag(heute), 28)
for (let i = 0; i < 5; i++) setzeTag(plusTage(release, i), 'arbeit', { blocker: 1, notiz: i === 0 ? 'Release-Woche' : null })
const jahr = heute.slice(0, 4)
for (const d of ['12-28', '12-29', '12-30']) setzeTag(`${jahr}-${d}`, 'urlaub')
const tagTyp = Object.fromEntries(tage.map(t => [t.datum, t]))

// --- Wipe ---
// Reihenfolge beachtet Fremdschlüssel
await client.batch([
  ...['block', 'vorlage_ausnahme', 'vorlage', 'todo', 'notiz', 'aufgabe', 'konto', 'tag', 'urlaubsanspruch', 'settings']
    .map(t => `DELETE FROM ${t}`),
  'DELETE FROM sqlite_sequence',
], 'write')

const insert = async (tabelle, zeilen) => {
  if (!zeilen.length) return
  const spalten = Object.keys(zeilen[0])
  await client.batch(zeilen.map(z => ({
    sql: `INSERT INTO ${tabelle} (${spalten.join(', ')}) VALUES (${spalten.map(() => '?').join(', ')})`,
    args: spalten.map(s => z[s] ?? null),
  })), 'write')
}

// --- Konten (ids 1…) ---
const konten = [
  { name: 'GALAXYBOT', farbe: 'lavendel', aliase: '["gb","galaxy"]', status: 'aktiv' },
  { name: 'Kundenportal', farbe: 'himmel', aliase: '["kp","portal"]', status: 'aktiv' },
  { name: 'Firmenmeeting', farbe: 'butter', aliase: '["meeting","fm"]', status: 'aktiv' },
  { name: 'Weiterbildung', farbe: 'mint', aliase: '["wb"]', status: 'aktiv' },
  { name: 'Support', farbe: 'pfirsich', aliase: '["sup"]', status: 'aktiv' },
  { name: 'Altprojekt Lager', farbe: 'salbei', aliase: '[]', status: 'archiviert' },
]
await insert('konto', konten.map(k => ({ ...k, erstellt_am: iso(start) })))
const K = { gb: 1, kp: 2, fm: 3, wb: 4, sup: 5, alt: 6 }

// --- Aufgaben (ids 1…) mit Aktivitätsfenster für die Blockverteilung ---
const aufgaben = [
  { konto_id: K.gb, key: 'GB-101', titel: 'Intent-Erkennung überarbeiten', schaetzung_min: 1200, von: -56, bis: -30 },
  { konto_id: K.gb, key: 'GB-114', titel: 'Antwort-Caching mit Redis', schaetzung_min: 900, von: -40, bis: 5 },
  { konto_id: K.gb, key: 'GB-120', titel: 'Monitoring-Dashboard', schaetzung_min: 600, von: -20, bis: 20 },
  { konto_id: K.gb, key: 'GB-127', titel: 'Tokenlimit pro Mandant', schaetzung_min: 480, von: -3, bis: 30 },
  { konto_id: K.kp, key: 'KP-42', titel: 'Login mit SSO', schaetzung_min: 960, von: -56, bis: -25 },
  { konto_id: K.kp, key: 'KP-57', titel: 'Rechnungsübersicht als PDF', schaetzung_min: 720, von: -28, bis: 10 },
  { konto_id: K.kp, key: 'KP-61', titel: 'Barrierefreiheit Formulare', schaetzung_min: null, von: -10, bis: 30 },
  { konto_id: K.wb, key: null, titel: 'Rust-Grundlagen', schaetzung_min: 1200, von: -56, bis: 30 },
  { konto_id: K.sup, key: 'SUP-8', titel: 'Tickets 3rd Level', schaetzung_min: null, von: -56, bis: 30 },
  { konto_id: K.alt, key: 'LAG-3', titel: 'Datenmigration Altsystem', schaetzung_min: 300, von: -56, bis: -45 },
]
await insert('aufgabe', aufgaben.map(({ von, bis, ...a }) => ({
  ...a,
  status: bis < 0 ? 'abgeschlossen' : 'offen',
  erstellt_am: iso(plusTage(heute, von - 3)),
  abgeschlossen_am: bis < 0 ? iso(plusTage(heute, bis), 960) : null,
})))
const gewichte = [3, 4, 3, 2, 3, 3, 2, 1, 1, 2] // Häufigkeit je Aufgabe
const aufgabenAm = (d) => {
  const offset = Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${heute}T12:00:00Z`)) / 864e5)
  return aufgaben.flatMap((a, i) => (offset >= a.von && offset <= a.bis ? Array(gewichte[i]).fill(i + 1) : []))
}

// --- Vorlagen ---
await insert('vorlage', [
  { name: 'Daily', aufgabe_id: null, konto_id: K.gb, start: 570, ende: 585, wochentage: '[1,2,3,4,5]', intervall_wochen: 1, gueltig_ab: start, gueltig_bis: null, aktiv: 1 },
  { name: 'Jour fixe', aufgabe_id: null, konto_id: K.fm, start: 840, ende: 900, wochentage: '[1]', intervall_wochen: 2, gueltig_ab: montag(start), gueltig_bis: null, aktiv: 1 },
  { name: 'Lernzeit', aufgabe_id: 8, konto_id: K.wb, start: 900, ende: 960, wochentage: '[5]', intervall_wochen: 1, gueltig_ab: start, gueltig_bis: null, aktiv: 1 },
])
await insert('vorlage_ausnahme', [{ vorlage_id: 1, datum: plusTage(montag(heute), -7) }])

// --- Blöcke ---
const notizen = ['Code-Review', 'Pairing', 'Bugfix nach Rückfrage', 'Tests ergänzt', 'Abstimmung mit PO', null, null, null, null]
const bloecke = []
const block = (datum, s, e, status, extra = {}) => bloecke.push({ datum, start: s, ende: e, kind: 'arbeit', status, aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null, ...extra })

// Füllt [von, bis) mit Arbeitsblöcken; feste Termine (Vorlagen) werden ausgespart
function fuelle(datum, von, bis, status, feste) {
  let t = von
  const pool = aufgabenAm(datum)
  for (const f of [...feste.filter(f => f.start >= von && f.start < bis), { start: bis, ende: bis }].sort((a, b) => a.start - b.start)) {
    while (t < f.start) {
      const e = Math.min(f.start, t + raster(45, 150))
      if (zufall() < 0.1) block(datum, t, e, status, { konto_id: wahl([K.fm, K.sup]) })
      else block(datum, t, e, status, { aufgabe_id: wahl(pool), notiz: wahl(notizen) })
      t = e
    }
    t = Math.max(t, f.ende)
  }
}

/** Bucht die Vorlagen-Termine des Tags, die bis `bisMin` enden – spätere materialisiert die App selbst. */
function festeTermine(datum, status, bisMin) {
  const wt = wochentag(datum)
  const feste = []
  const woche = Math.round((new Date(`${montag(datum)}T12:00:00Z`) - new Date(`${montag(start)}T12:00:00Z`)) / (7 * 864e5))
  if (datum !== plusTage(montag(heute), -7)) feste.push({ start: 570, ende: 585, vorlage_id: 1, konto_id: K.gb })
  if (wt === 1 && woche % 2 === 0) feste.push({ start: 840, ende: 900, vorlage_id: 2, konto_id: K.fm })
  if (wt === 5) feste.push({ start: 900, ende: 960, vorlage_id: 3, aufgabe_id: 8 })
  const faellig = feste.filter(f => f.ende <= bisMin)
  for (const { start: s, ende: e, ...rest } of faellig) block(datum, s, e, status, rest)
  return faellig
}

for (let d = start; d <= plusTage(heute, 7); d = plusTage(d, 1)) {
  const typ = tagTyp[d]?.typ
  if (wochentag(d) > 5 || ['urlaub', 'krank', 'gleittag'].includes(typ)) continue
  if (d > heute) {
    // Zukunft: nur ein paar geplante Blöcke; Vorlagen materialisiert die App selbst
    if (d > plusTage(heute, 3)) continue
    const pool = aufgabenAm(d)
    block(d, 600, 720, 'geplant', { aufgabe_id: wahl(pool) })
    block(d, 765, 840, 'geplant', { aufgabe_id: wahl(pool) })
    continue
  }
  const beginn = raster(465, 525)
  if (d === heute) {
    const feste = festeTermine(d, 'gebucht', 600)
    fuelle(d, beginn, 660, 'gebucht', feste)
    bloecke.push({ datum: d, start: 720, ende: 765, kind: 'pause', status: 'geplant', aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null })
    fuelle(d, 660, 720, 'geplant', [])
    fuelle(d, 765, 1005, 'geplant', [])
    continue
  }
  const soll = typ === 'halb_urlaub' ? 240 : (tagTyp[d]?.soll_override ?? 480)
  const ende = beginn + soll + 45 + raster(-45, 75)
  const feste = festeTermine(d, 'gebucht', ende)
  if (ende <= 720) {
    fuelle(d, beginn, ende, 'gebucht', feste)
    continue
  }
  const pause = raster(705, 750)
  fuelle(d, beginn, pause, 'gebucht', feste.filter(f => f.start < pause))
  bloecke.push({ datum: d, start: pause, ende: pause + 45, kind: 'pause', status: 'gebucht', aufgabe_id: null, konto_id: null, notiz: null, vorlage_id: null })
  fuelle(d, pause + 45, ende, 'gebucht', feste.filter(f => f.start >= pause))
}
// Wie loeseZielAuf: Aufgaben-Blöcke tragen zusätzlich das Konto ihrer Aufgabe
await insert('block', bloecke.map(b => ({
  ...b,
  konto_id: b.aufgabe_id ? aufgaben[b.aufgabe_id - 1].konto_id : b.konto_id,
  erstellt_am: iso(b.datum, b.start),
})))

await insert('tag', tage)

// --- Todos ---
await insert('todo', [
  { art: 'merker', text: 'Reisekosten September einreichen', faellig_am: plusTage(heute, -2), sortierung: 0 },
  { art: 'merker', text: 'Zertifikat für Staging erneuern', faellig_am: heute, aufgabe_id: 3, sortierung: 1 },
  { art: 'merker', text: 'Feedbackgespräch vorbereiten', faellig_am: plusTage(heute, 5), sortierung: 2 },
  { art: 'merker', text: 'Doku zu Caching-Strategie schreiben', aufgabe_id: 2, sortierung: 3 },
  { art: 'merker', text: 'Laptop-Tausch beantragen', sortierung: 4, erledigt_am: iso(plusTage(heute, -4)) },
  { art: 'daily', text: 'Blocker: Staging-DB voll', konto_id: K.gb, sortierung: 0 },
  { art: 'daily', text: 'PDF-Rendering: Library-Entscheidung', aufgabe_id: 6, sortierung: 1 },
  { art: 'daily', text: 'Urlaubsvertretung klären', sortierung: 2 },
  { art: 'daily', text: 'Review GB-114 offen', aufgabe_id: 2, sortierung: 3, erledigt_am: iso(plusTage(heute, -1)) },
  { art: 'warten', text: 'Freigabe Rechnungslayout', wer: 'Fachbereich Finanzen', nachfassen_am: plusTage(heute, -1), aufgabe_id: 6, sortierung: 0 },
  { art: 'warten', text: 'SSO-Zugangsdaten Testumgebung', wer: 'IT-Betrieb', nachfassen_am: plusTage(heute, 3), konto_id: K.kp, sortierung: 1 },
  { art: 'warten', text: 'Budget für Rust-Schulung', wer: 'Teamleitung', nachfassen_am: plusTage(heute, 10), aufgabe_id: 8, sortierung: 2 },
].map(t => ({ wer: null, nachfassen_am: null, aufgabe_id: null, konto_id: null, faellig_am: null, erledigt_am: null, erstellt_am: iso(plusTage(heute, -7)), ...t })))

// --- Notizen ---
await insert('notiz', [
  { titel: 'Deployment-Checkliste', inhalt: '## Vor dem Release\n\n- [ ] Migrationen geprüft\n- [ ] Feature-Flags gesetzt\n- [ ] Changelog aktualisiert\n\n## Danach\n\n1. Smoke-Tests\n2. Monitoring 30 min beobachten', tags: '["release","checkliste"]', konto_id: K.gb, angepinnt: 1, tage: -20 },
  { titel: 'Redis-Konfiguration', inhalt: 'TTL **300 s** für Antworten, Invalidierung per Pub/Sub.\n\n```\nmaxmemory-policy allkeys-lru\n```', tags: '["redis","technik"]', aufgabe_id: 2, angepinnt: 1, tage: -5 },
  { titel: 'Retro-Notizen Sprint 18', inhalt: '**Gut:** Pairing, schnellere Reviews\n\n**Verbessern:** Tickets kleiner schneiden, Daily pünktlich beenden', tags: '["retro"]', konto_id: K.gb, angepinnt: 0, tage: -12 },
  { titel: 'SSO-Flow', inhalt: '1. Redirect zum IdP\n2. Callback mit Code\n3. Token-Tausch serverseitig\n\n> Refresh-Token nie im Browser speichern.', tags: '["sso","technik"]', aufgabe_id: 5, angepinnt: 0, tage: -40 },
  { titel: 'Ideen Weiterbildung', inhalt: '- Rust Ownership-Kapitel\n- Vortrag über Observability\n- Konferenz im Frühjahr', tags: '["lernen"]', konto_id: K.wb, angepinnt: 0, tage: -2 },
  { titel: 'Telefonnummern', inhalt: 'IT-Hotline: 1234\nEmpfang: 1000', tags: '[]', angepinnt: 0, tage: -50 },
].map(({ tage: t, ...n }) => ({ aufgabe_id: null, konto_id: null, ...n, erstellt_am: iso(plusTage(heute, t - 3)), geaendert_am: iso(plusTage(heute, t), 900) })))

// --- Urlaubsanspruch & Einstellungen ---
await insert('urlaubsanspruch', [
  { jahr: Number(jahr), art: 'grund', bezeichnung: 'Grundanspruch', tage: 30 },
  { jahr: Number(jahr), art: 'zusatz', bezeichnung: 'Sonderurlaub Umzug', tage: 1 },
  { jahr: Number(jahr), art: 'rest', bezeichnung: `Resturlaub ${Number(jahr) - 1}`, tage: 4.5 },
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

console.log(`Seed fertig (${url}): ${konten.length} Konten, ${aufgaben.length} Aufgaben, ${bloecke.length} Blöcke, ${tage.length} Tage`)
