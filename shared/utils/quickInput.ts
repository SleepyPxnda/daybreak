import type { BlockKind, BlockStatus } from './bloecke'
import type { TodoArt } from './todos'
import type { Datum } from './zeit'
import { istDatum, plusTage, RASTER_MIN, TAG_MIN, wochentag } from './zeit'

// Schnelleingabe (Plan §3.8) – reiner Parser, schreibt nichts.
// Zeit buchen/planen, Pausen, Merker (t), Daily-Themen (d), Warten auf (w), Notizen (n).

export interface QiAufgabe {
  id: number
  key?: string | null
  titel: string
  kontoId: number
  status: 'offen' | 'abgeschlossen'
}

export interface QiKonto {
  id: number
  name: string
  aliase: string[]
  status: 'aktiv' | 'archiviert'
}

export interface QiKontext {
  heute: Datum
  /** Tag ohne Datumsangabe (z. B. der gerade angezeigte Tag); Default: heute */
  standardDatum?: Datum
  aufgaben: QiAufgabe[]
  konten: QiKonto[]
}

export type QiZiel =
  | { typ: 'aufgabe', aufgabeId: number, kontoId: number }
  | { typ: 'konto', kontoId: number }
  | { typ: 'neueAufgabe', titel: string, kontoId: number }

export type QiZeit = { dauer: number } | { start: number, ende: number }

export interface QiBlock {
  art: 'block'
  kind: BlockKind
  status: BlockStatus
  datum: Datum
  zeit: QiZeit
  /** Eindeutiges Ziel (fehlt bei Pausen und bei Mehrdeutigkeit) */
  ziel?: QiZiel
  /** Mehrere Treffer → Auswahl-Popover */
  kandidaten?: QiZiel[]
  notiz?: string
}

export interface QiTodo {
  art: 'todo'
  todoArt: TodoArt
  text: string
  /** Nur „Warten auf“: Text vor dem ersten „:“ */
  wer?: string
  /** `bis <datum>`: Nachfass-Datum (warten) bzw. Fälligkeit (merker) */
  stichtag?: Datum
}

/** `n Titel` – neue Notiz, öffnet den Editor */
export interface QiNotiz {
  art: 'notiz'
  titel: string
}

export type QiErgebnis =
  | { art: 'leer' }
  | { art: 'suche', text: string }
  | { art: 'fehler', meldung: string }
  | QiBlock
  | QiTodo
  | QiNotiz

const TODO_PRAEFIXE: Record<string, TodoArt> = { t: 'merker', d: 'daily', w: 'warten' }

/** `t …`, `d …`, `w wer: …` – optional `bis <datum>` am Ende (nicht bei Daily-Themen). */
function parseTodo(todoArt: TodoArt, woerter: string[], heute: Datum): QiTodo | { art: 'fehler', meldung: string } {
  let rest = woerter
  let stichtag: Datum | undefined
  if (todoArt !== 'daily' && rest.length >= 3 && norm(rest.at(-2)!) === 'bis') {
    stichtag = parseDatumToken(rest.at(-1)!, heute, 'vor')
    if (stichtag) rest = rest.slice(0, -2)
  }

  let text = rest.join(' ').trim()
  let wer: string | undefined
  if (todoArt === 'warten') {
    const doppelpunkt = text.indexOf(':')
    if (doppelpunkt > 0) {
      wer = text.slice(0, doppelpunkt).trim()
      text = text.slice(doppelpunkt + 1).trim()
    }
  }
  if (!text) return { art: 'fehler', meldung: 'Text fehlt' }
  return { art: 'todo', todoArt, text, ...(wer ? { wer } : {}), ...(stichtag ? { stichtag } : {}) }
}

const WOCHENTAGE: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7 }

const norm = (s: string) => s.toLocaleLowerCase('de')

/** '2h', '1.5h', '1,5h', '1h30', '45m', '90m' → Minuten; undefined wenn kein Dauer-Token */
export function parseDauer(token: string): number | undefined {
  const t = norm(token)
  let m = /^(\d+(?:[.,]\d+)?)h$/.exec(t)
  if (m) return Math.round(Number(m[1]!.replace(',', '.')) * 60)
  m = /^(\d+)h(\d{1,2})m?$/.exec(t)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = /^(\d+)m(?:in)?$/.exec(t)
  if (m) return Number(m[1])
  return undefined
}

/** '9:00-10:30', '9-10', '14:15–15' → Zeitraum; undefined wenn kein Zeitraum-Token */
export function parseZeitraum(token: string): { start: number, ende: number } | undefined {
  const m = /^(\d{1,2})(?::(\d{2}))?[-–](\d{1,2})(?::(\d{2}))?$/.exec(token)
  if (!m) return undefined
  return {
    start: Number(m[1]) * 60 + Number(m[2] ?? 0),
    ende: Number(m[3]) * 60 + Number(m[4] ?? 0),
  }
}

/** Datums-Token relativ zu heute; für geplante Blöcke zeigen Wochentage nach vorn, für gebuchte zurück. */
export function parseDatumToken(token: string, heute: Datum, richtung: 'vor' | 'zurueck'): Datum | undefined {
  const t = norm(token)
  if (t === 'heute') return heute
  if (t === 'morgen') return plusTage(heute, 1)
  if (t === 'übermorgen' || t === 'uebermorgen') return plusTage(heute, 2)
  if (t === 'gestern') return plusTage(heute, -1)
  if (istDatum(t)) return t
  const ziel = WOCHENTAGE[t]
  if (ziel === undefined) return undefined
  const aktuell = wochentag(heute)
  if (richtung === 'vor') return plusTage(heute, ((ziel - aktuell + 6) % 7) + 1) // 1…7 Tage nach vorn
  return plusTage(heute, -((aktuell - ziel + 7) % 7)) // 0…6 Tage zurück
}

function titelPasst(query: string[], titel: string): boolean {
  const t = norm(titel)
  return query.every(wort => t.includes(norm(wort)))
}

/** Längster Wortanfang von `woerter`, der auf mindestens einen Kandidaten passt. */
function fuzzyPraefix<T>(woerter: string[], kandidaten: T[], text: (k: T) => string, nurVoll = false) {
  for (let n = woerter.length; n >= (nurVoll ? woerter.length : 1); n--) {
    const query = woerter.slice(0, n)
    const treffer = kandidaten.filter(k => titelPasst(query, text(k)))
    if (treffer.length > 0) return { treffer, rest: woerter.slice(n) }
  }
  return undefined
}

const notizAus = (woerter: string[]) => (woerter.length ? woerter.join(' ') : undefined)

function findeKonto(name: string, konten: QiKonto[]): QiKonto[] {
  const n = norm(name)
  const aktiv = konten.filter(k => k.status === 'aktiv')
  const perAlias = aktiv.filter(k => k.aliase.some(a => norm(a) === n))
  if (perAlias.length) return perAlias
  const exakt = aktiv.filter(k => norm(k.name) === n)
  if (exakt.length) return exakt
  return aktiv.filter(k => norm(k.name).includes(n))
}

type ZielErgebnis = { ziel?: QiZiel, kandidaten?: QiZiel[], notiz?: string } | { fehler: string }

/** Ziel-Erkennung: Key exakt → Konto-Alias → Fuzzy Aufgaben → (@konto: neue Aufgabe) → Fuzzy Konto-Namen */
function erkenneZiel(woerter: string[], atKonto: QiKonto | undefined, ctx: QiKontext): ZielErgebnis {
  const [erstes, ...danach] = woerter

  if (erstes) {
    const perKey = ctx.aufgaben.find(a => a.key && norm(a.key) === norm(erstes))
    if (perKey) return { ziel: { typ: 'aufgabe', aufgabeId: perKey.id, kontoId: perKey.kontoId }, notiz: notizAus(danach) }

    const perAlias = ctx.konten.find(k => k.status === 'aktiv' && k.aliase.some(a => norm(a) === norm(erstes)))
    if (perAlias) return { ziel: { typ: 'konto', kontoId: perAlias.id }, notiz: notizAus(danach) }
  }

  if (atKonto && woerter.length === 0) return { ziel: { typ: 'konto', kontoId: atKonto.id } }

  const offen = ctx.aufgaben.filter(a => a.status === 'offen' && (!atKonto || a.kontoId === atKonto.id))
  // Mit @konto muss der ganze Text passen – sonst ist es eine neue Aufgabe (Plan: „2h Neue Idee @apollo“)
  const aufgabenTreffer = fuzzyPraefix(woerter, offen, a => a.titel, !!atKonto)
  if (aufgabenTreffer) {
    const ziele = aufgabenTreffer.treffer.map(a => ({ typ: 'aufgabe' as const, aufgabeId: a.id, kontoId: a.kontoId }))
    const notiz = notizAus(aufgabenTreffer.rest)
    return ziele.length === 1 ? { ziel: ziele[0], notiz } : { kandidaten: ziele, notiz }
  }

  if (atKonto) return { ziel: { typ: 'neueAufgabe', titel: woerter.join(' '), kontoId: atKonto.id } }

  const aktiveKonten = ctx.konten.filter(k => k.status === 'aktiv')
  const kontoTreffer = fuzzyPraefix(woerter, aktiveKonten, k => k.name)
  if (kontoTreffer) {
    const ziele = kontoTreffer.treffer.map(k => ({ typ: 'konto' as const, kontoId: k.id }))
    const notiz = notizAus(kontoTreffer.rest)
    return ziele.length === 1 ? { ziel: ziele[0], notiz } : { kandidaten: ziele, notiz }
  }

  return { fehler: 'Keine Aufgabe und kein Konto gefunden – mit @konto als neue Aufgabe anlegen' }
}

export function parseQuickInput(eingabe: string, ctx: QiKontext): QiErgebnis {
  const text = eingabe.trim()
  if (!text) return { art: 'leer' }
  let woerter = text.split(/\s+/)

  const todoArt = TODO_PRAEFIXE[norm(woerter[0]!)]
  if (todoArt) return parseTodo(todoArt, woerter.slice(1), ctx.heute)

  if (norm(woerter[0]!) === 'n') {
    const titel = woerter.slice(1).join(' ')
    return titel ? { art: 'notiz', titel } : { art: 'fehler', meldung: 'Titel fehlt' }
  }

  let kind: BlockKind = 'arbeit'
  let status: BlockStatus = 'gebucht'
  const praefix = norm(woerter[0]!)
  if (praefix === 'p') kind = 'pause'
  else if (praefix === 'plan') status = 'geplant'
  const hatPraefix = kind === 'pause' || status === 'geplant'
  if (hatPraefix) woerter = woerter.slice(1)

  // Dauer bzw. Uhrzeit direkt nach dem Präfix
  const zeitToken = woerter[0] ?? ''
  const dauer = parseDauer(zeitToken)
  const zeitraum = dauer === undefined ? parseZeitraum(zeitToken) : undefined
  if (dauer === undefined && !zeitraum) {
    return hatPraefix ? { art: 'fehler', meldung: 'Dauer (z. B. 2h, 45m) oder Uhrzeit (9:00-10:30) fehlt' } : { art: 'suche', text }
  }
  woerter = woerter.slice(1)

  let zeit: QiZeit
  if (dauer !== undefined) {
    if (dauer <= 0 || dauer > TAG_MIN) return { art: 'fehler', meldung: 'Ungültige Dauer' }
    if (dauer % RASTER_MIN !== 0) return { art: 'fehler', meldung: 'Dauer muss im 15-Minuten-Raster liegen' }
    zeit = { dauer }
  }
  else {
    const { start, ende } = zeitraum!
    if (start % RASTER_MIN !== 0 || ende % RASTER_MIN !== 0) return { art: 'fehler', meldung: 'Uhrzeiten müssen im 15-Minuten-Raster liegen' }
    if (start >= ende || ende > TAG_MIN) return { art: 'fehler', meldung: 'Ungültiger Zeitraum' }
    zeit = { start, ende }
  }

  // Datum als letztes Wort
  let datum = ctx.standardDatum ?? ctx.heute
  const letztes = woerter.at(-1)
  const datumAusToken = letztes ? parseDatumToken(letztes, ctx.heute, status === 'geplant' ? 'vor' : 'zurueck') : undefined
  if (datumAusToken) {
    datum = datumAusToken
    woerter = woerter.slice(0, -1)
  }
  if (status === 'gebucht' && datum > ctx.heute) {
    return { art: 'fehler', meldung: 'Gebucht werden kann nur bis heute – für die Zukunft „plan“ voranstellen' }
  }

  if (kind === 'pause') return { art: 'block', kind, status, datum, zeit, notiz: notizAus(woerter) }

  // @konto (irgendwo im Text)
  let atKonto: QiKonto | undefined
  const atToken = woerter.find(w => w.startsWith('@') && w.length > 1)
  if (atToken) {
    const treffer = findeKonto(atToken.slice(1), ctx.konten)
    if (treffer.length === 0) return { art: 'fehler', meldung: `Konto ${atToken} nicht gefunden` }
    if (treffer.length > 1) return { art: 'fehler', meldung: `Konto ${atToken} ist mehrdeutig` }
    atKonto = treffer[0]
    woerter = woerter.filter(w => w !== atToken)
  }

  const ziel = erkenneZiel(woerter, atKonto, ctx)
  if ('fehler' in ziel) return { art: 'fehler', meldung: ziel.fehler }
  return { art: 'block', kind, status, datum, zeit, ...ziel }
}
