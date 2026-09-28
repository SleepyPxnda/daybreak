import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Datum: 'YYYY-MM-DD', Uhrzeiten: Minuten seit Mitternacht, Timestamps: ISO-Strings (Plan §4)

const erstelltAm = () => text('erstellt_am').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)

export const konto = sqliteTable('konto', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  farbe: text('farbe').notNull(),
  aliase: text('aliase', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  status: text('status', { enum: ['aktiv', 'archiviert'] }).notNull().default('aktiv'),
  erstelltAm: erstelltAm(),
})

export const aufgabe = sqliteTable('aufgabe', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kontoId: integer('konto_id').notNull().references(() => konto.id),
  key: text('key').unique(),
  titel: text('titel').notNull(),
  status: text('status', { enum: ['offen', 'abgeschlossen'] }).notNull().default('offen'),
  schaetzungMin: integer('schaetzung_min'),
  erstelltAm: erstelltAm(),
  abgeschlossenAm: text('abgeschlossen_am'),
}, t => [
  index('aufgabe_konto_status_idx').on(t.kontoId, t.status),
])

export const vorlage = sqliteTable('vorlage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  aufgabeId: integer('aufgabe_id').references(() => aufgabe.id),
  kontoId: integer('konto_id').references(() => konto.id),
  start: integer('start').notNull(),
  ende: integer('ende').notNull(),
  wochentage: text('wochentage', { mode: 'json' }).$type<number[]>().notNull(),
  intervallWochen: integer('intervall_wochen').notNull().default(1),
  gueltigAb: text('gueltig_ab').notNull(),
  gueltigBis: text('gueltig_bis'),
  aktiv: integer('aktiv', { mode: 'boolean' }).notNull().default(true),
})

export const vorlageAusnahme = sqliteTable('vorlage_ausnahme', {
  vorlageId: integer('vorlage_id').notNull().references(() => vorlage.id, { onDelete: 'cascade' }),
  datum: text('datum').notNull(),
}, t => [
  primaryKey({ columns: [t.vorlageId, t.datum] }),
])

export const block = sqliteTable('block', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  datum: text('datum').notNull(),
  start: integer('start').notNull(),
  ende: integer('ende').notNull(),
  kind: text('kind', { enum: ['arbeit', 'pause'] }).notNull(),
  status: text('status', { enum: ['geplant', 'gebucht'] }).notNull(),
  aufgabeId: integer('aufgabe_id').references(() => aufgabe.id),
  kontoId: integer('konto_id').references(() => konto.id),
  notiz: text('notiz'),
  vorlageId: integer('vorlage_id').references(() => vorlage.id, { onDelete: 'set null' }),
  erstelltAm: erstelltAm(),
}, t => [
  index('block_datum_idx').on(t.datum),
  index('block_aufgabe_idx').on(t.aufgabeId),
  index('block_konto_idx').on(t.kontoId),
  // SQLite behandelt NULLs als verschieden → greift nur, wo vorlageId gesetzt ist
  uniqueIndex('block_vorlage_datum_uq').on(t.vorlageId, t.datum),
])

export const tag = sqliteTable('tag', {
  datum: text('datum').primaryKey(),
  typ: text('typ', { enum: ['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag'] }).notNull(),
  sollOverride: integer('soll_override'),
  notiz: text('notiz'),
})

export const todo = sqliteTable('todo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  art: text('art', { enum: ['merker', 'daily', 'warten'] }).notNull(),
  text: text('text').notNull(),
  wer: text('wer'),
  nachfassenAm: text('nachfassen_am'),
  aufgabeId: integer('aufgabe_id').references(() => aufgabe.id),
  kontoId: integer('konto_id').references(() => konto.id),
  faelligAm: text('faellig_am'),
  sortierung: integer('sortierung').notNull().default(0),
  erledigtAm: text('erledigt_am'),
  erstelltAm: erstelltAm(),
}, t => [
  index('todo_art_erledigt_idx').on(t.art, t.erledigtAm),
])

export const notiz = sqliteTable('notiz', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titel: text('titel').notNull(),
  inhalt: text('inhalt').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  aufgabeId: integer('aufgabe_id').references(() => aufgabe.id),
  kontoId: integer('konto_id').references(() => konto.id),
  angepinnt: integer('angepinnt', { mode: 'boolean' }).notNull().default(false),
  erstelltAm: erstelltAm(),
  geaendertAm: text('geaendert_am').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, t => [
  index('notiz_geaendert_idx').on(t.geaendertAm),
])

export const urlaubsanspruch = sqliteTable('urlaubsanspruch', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jahr: integer('jahr').notNull(),
  art: text('art', { enum: ['grund', 'zusatz', 'rest'] }).notNull(),
  bezeichnung: text('bezeichnung').notNull(),
  tage: real('tage').notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})
