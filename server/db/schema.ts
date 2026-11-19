import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Dates: 'YYYY-MM-DD', times: minutes since midnight, timestamps: ISO strings

const createdAt = () => text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)

export const account = sqliteTable('account', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
})

export const task = sqliteTable('task', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => account.id),
  key: text('key').unique(),
  title: text('title').notNull(),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  estimateMin: integer('estimate_min'),
  createdAt: createdAt(),
  closedAt: text('closed_at'),
}, t => [
  index('task_account_status_idx').on(t.accountId, t.status),
])

export const template = sqliteTable('template', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Optional display name, e.g. "Daily" - shown on the generated blocks */
  name: text('name'),
  taskId: integer('task_id').references(() => task.id),
  accountId: integer('account_id').references(() => account.id),
  start: integer('start').notNull(),
  end: integer('end').notNull(),
  weekdays: text('weekdays', { mode: 'json' }).$type<number[]>().notNull(),
  intervalWeeks: integer('interval_weeks').notNull().default(1),
  validFrom: text('valid_from').notNull(),
  validUntil: text('valid_until'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
})

export const templateException = sqliteTable('template_exception', {
  templateId: integer('template_id').notNull().references(() => template.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
}, t => [
  primaryKey({ columns: [t.templateId, t.date] }),
])

export const block = sqliteTable('block', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  start: integer('start').notNull(),
  end: integer('end').notNull(),
  kind: text('kind', { enum: ['work', 'break'] }).notNull(),
  status: text('status', { enum: ['planned', 'booked'] }).notNull(),
  taskId: integer('task_id').references(() => task.id),
  accountId: integer('account_id').references(() => account.id),
  note: text('note'),
  templateId: integer('template_id').references(() => template.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, t => [
  index('block_date_idx').on(t.date),
  index('block_task_idx').on(t.taskId),
  index('block_account_idx').on(t.accountId),
  // SQLite treats NULLs as distinct, so this only applies where the template id is set
  uniqueIndex('block_template_date_uq').on(t.templateId, t.date),
])

export const day = sqliteTable('day', {
  date: text('date').primaryKey(),
  type: text('type', { enum: ['work', 'vacation', 'half_vacation', 'sick', 'flex_day'] }).notNull(),
  targetOverride: integer('target_override'),
  note: text('note'),
  /** Calendar blocker: hint not to take vacation here - independent of the day type, does not change the target */
  blocker: integer('blocker', { mode: 'boolean' }).notNull().default(false),
  /** Vacation confirmed (handover done) - reset as soon as the day type changes */
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
})

/** On a type change via upsert discard the confirmation, otherwise keep it */
export const confirmedOnTypeChange = sql`CASE WHEN ${day.type} = excluded.type THEN ${day.confirmed} ELSE 0 END`

export const todo = sqliteTable('todo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind', { enum: ['reminder', 'daily_topic', 'waiting_for'] }).notNull(),
  text: text('text').notNull(),
  person: text('person'),
  followUpDate: text('follow_up_date'),
  taskId: integer('task_id').references(() => task.id),
  accountId: integer('account_id').references(() => account.id),
  dueDate: text('due_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  doneAt: text('done_at'),
  createdAt: createdAt(),
}, t => [
  index('todo_kind_done_idx').on(t.kind, t.doneAt),
])

export const note = sqliteTable('note', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  taskId: integer('task_id').references(() => task.id),
  accountId: integer('account_id').references(() => account.id),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, t => [
  index('note_updated_idx').on(t.updatedAt),
])

export const vacationEntitlement = sqliteTable('vacation_entitlement', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  kind: text('kind', { enum: ['base', 'extra', 'carryover'] }).notNull(),
  label: text('label').notNull(),
  days: real('days').notNull(),
  validFrom: text('valid_from'),
  validUntil: text('valid_until'),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})
