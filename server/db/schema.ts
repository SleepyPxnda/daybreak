import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Dates: 'YYYY-MM-DD', times: minutes since midnight, timestamps: ISO strings

const createdAt = () => text('erstellt_am').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)

export const account = sqliteTable('konto', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('farbe').notNull(),
  aliases: text('aliase', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  status: text('status', { enum: ['aktiv', 'archiviert'] }).notNull().default('aktiv'),
  createdAt: createdAt(),
})

export const task = sqliteTable('aufgabe', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('konto_id').notNull().references(() => account.id),
  key: text('key').unique(),
  title: text('titel').notNull(),
  status: text('status', { enum: ['offen', 'abgeschlossen'] }).notNull().default('offen'),
  estimateMin: integer('schaetzung_min'),
  createdAt: createdAt(),
  closedAt: text('abgeschlossen_am'),
}, t => [
  index('aufgabe_konto_status_idx').on(t.accountId, t.status),
])

export const template = sqliteTable('vorlage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Optional display name, e.g. "Daily" - shown on the generated blocks */
  name: text('name'),
  taskId: integer('aufgabe_id').references(() => task.id),
  accountId: integer('konto_id').references(() => account.id),
  start: integer('start').notNull(),
  end: integer('ende').notNull(),
  weekdays: text('wochentage', { mode: 'json' }).$type<number[]>().notNull(),
  intervalWeeks: integer('intervall_wochen').notNull().default(1),
  validFrom: text('gueltig_ab').notNull(),
  validUntil: text('gueltig_bis'),
  active: integer('aktiv', { mode: 'boolean' }).notNull().default(true),
})

export const templateException = sqliteTable('vorlage_ausnahme', {
  templateId: integer('vorlage_id').notNull().references(() => template.id, { onDelete: 'cascade' }),
  date: text('datum').notNull(),
}, t => [
  primaryKey({ columns: [t.templateId, t.date] }),
])

export const block = sqliteTable('block', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('datum').notNull(),
  start: integer('start').notNull(),
  end: integer('ende').notNull(),
  kind: text('kind', { enum: ['arbeit', 'pause'] }).notNull(),
  status: text('status', { enum: ['geplant', 'gebucht'] }).notNull(),
  taskId: integer('aufgabe_id').references(() => task.id),
  accountId: integer('konto_id').references(() => account.id),
  note: text('notiz'),
  templateId: integer('vorlage_id').references(() => template.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, t => [
  index('block_datum_idx').on(t.date),
  index('block_aufgabe_idx').on(t.taskId),
  index('block_konto_idx').on(t.accountId),
  // SQLite treats NULLs as distinct, so this only applies where the template id is set
  uniqueIndex('block_vorlage_datum_uq').on(t.templateId, t.date),
])

export const day = sqliteTable('tag', {
  date: text('datum').primaryKey(),
  type: text('typ', { enum: ['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag'] }).notNull(),
  targetOverride: integer('soll_override'),
  note: text('notiz'),
  /** Calendar blocker: hint not to take vacation here - independent of the day type, does not change the target */
  blocker: integer('blocker', { mode: 'boolean' }).notNull().default(false),
  /** Vacation confirmed (handover done) - reset as soon as the day type changes */
  confirmed: integer('bestaetigt', { mode: 'boolean' }).notNull().default(false),
})

/** On a type change via upsert discard the confirmation, otherwise keep it */
export const confirmedOnTypeChange = sql`CASE WHEN ${day.type} = excluded.typ THEN ${day.confirmed} ELSE 0 END`

export const todo = sqliteTable('todo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('art', { enum: ['merker', 'daily', 'warten'] }).notNull(),
  text: text('text').notNull(),
  person: text('wer'),
  followUpDate: text('nachfassen_am'),
  taskId: integer('aufgabe_id').references(() => task.id),
  accountId: integer('konto_id').references(() => account.id),
  dueDate: text('faellig_am'),
  sortOrder: integer('sortierung').notNull().default(0),
  doneAt: text('erledigt_am'),
  createdAt: createdAt(),
}, t => [
  index('todo_art_erledigt_idx').on(t.kind, t.doneAt),
])

export const note = sqliteTable('notiz', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('titel').notNull(),
  content: text('inhalt').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  taskId: integer('aufgabe_id').references(() => task.id),
  accountId: integer('konto_id').references(() => account.id),
  pinned: integer('angepinnt', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: text('geaendert_am').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, t => [
  index('notiz_geaendert_idx').on(t.updatedAt),
])

export const vacationEntitlement = sqliteTable('urlaubsanspruch', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('jahr').notNull(),
  kind: text('art', { enum: ['grund', 'zusatz', 'rest'] }).notNull(),
  label: text('bezeichnung').notNull(),
  days: real('tage').notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})
