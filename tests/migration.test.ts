import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import { is } from 'drizzle-orm'
import { SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '../server/db/schema'

const REAL_MIGRATIONS = join(process.cwd(), 'drizzle')
const LAST_GERMAN_MIGRATION_INDEX = 3

let workDir: string
let client: Client

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'daybreak-migration-'))
  client = createClient({ url: `file:${join(workDir, 'test.db')}` })
})

afterEach(() => {
  client.close()
  rmSync(workDir, { recursive: true, force: true })
})

/** Copy of `drizzle/` whose journal only lists the migrations up to the given index. */
function migrationsUpTo(lastIndex: number) {
  const folder = join(workDir, 'drizzle-old')
  cpSync(REAL_MIGRATIONS, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= lastIndex)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

async function rows(sql: string) {
  return (await client.execute(sql)).rows.map(row => ({ ...row }))
}

const SETTINGS_BEFORE: Record<string, unknown> = {
  sollProTagMin: 450,
  arbeitstage: [1, 2, 3, 4],
  bundesland: 'BY',
  arbeitsbeginn: 540,
  timelineVon: 480,
  timelineBis: 1080,
  stundenkontoStart: { datum: '2026-01-05', saldoMin: -135 },
  urlaubErinnerungTage: 14,
  urlaubErinnerungText: 'Übergabe planen',
  erinnerungenAktiv: true,
  erinnerungLueckeMin: 90,
  erinnerungFeierabend: 1020,
  urlaubVorbelegt: true,
}

const SETTINGS_AFTER: Record<string, unknown> = {
  targetPerDayMin: 450,
  workdays: [1, 2, 3, 4],
  federalState: 'BY',
  workStart: 540,
  timelineFrom: 480,
  timelineTo: 1080,
  balanceStart: { date: '2026-01-05', balanceMin: -135 },
  vacationNoticeDays: 14,
  vacationNoticeText: 'Übergabe planen',
  bookingNotificationsEnabled: true,
  bookingNotificationGapMin: 90,
  bookingNotificationEndOfDay: 1020,
  vacationPrefilled: true,
}

const COLORS_BEFORE = ['lavendel', 'pfirsich', 'mint', 'himmel', 'rose', 'butter', 'salbei', 'flieder']
const COLORS_AFTER = ['lavender', 'peach', 'mint', 'sky', 'rose', 'butter', 'sage', 'lilac']

/** German data as written by the app at migration 0003: every table, every stored value. */
async function insertGermanFixture() {
  const statements: { sql: string, args?: (string | number)[] }[] = [
    ...COLORS_BEFORE.map((farbe, index) => ({
      sql: 'INSERT INTO konto (name, farbe, aliase, status) VALUES (?, ?, ?, ?)',
      args: [`Konto ${index + 1}`, farbe, '["a"]', index === 7 ? 'archiviert' : 'aktiv'],
    })),
    { sql: 'INSERT INTO aufgabe (konto_id, key, titel, status, schaetzung_min, abgeschlossen_am) VALUES (1, \'K-1\', \'Offen\', \'offen\', 60, NULL)' },
    { sql: 'INSERT INTO aufgabe (konto_id, key, titel, status, schaetzung_min, abgeschlossen_am) VALUES (2, \'K-2\', \'Zu\', \'abgeschlossen\', NULL, \'2026-01-02T10:00:00.000Z\')' },
    { sql: 'INSERT INTO vorlage (name, aufgabe_id, konto_id, start, ende, wochentage, intervall_wochen, gueltig_ab, gueltig_bis, aktiv) VALUES (\'Daily\', NULL, 1, 570, 585, \'[1,2,3]\', 2, \'2026-01-05\', \'2026-12-31\', 1)' },
    { sql: 'INSERT INTO vorlage_ausnahme (vorlage_id, datum) VALUES (1, \'2026-01-12\')' },
    { sql: 'INSERT INTO block (datum, start, ende, kind, status, aufgabe_id, konto_id, notiz, vorlage_id) VALUES (\'2026-01-05\', 600, 660, \'arbeit\', \'gebucht\', 1, 1, \'Notiz\', 1)' },
    { sql: 'INSERT INTO block (datum, start, ende, kind, status, aufgabe_id, konto_id, notiz, vorlage_id) VALUES (\'2026-01-05\', 720, 765, \'pause\', \'geplant\', NULL, NULL, NULL, NULL)' },
    ...['arbeit', 'urlaub', 'halb_urlaub', 'krank', 'gleittag'].map((typ, index) => ({
      sql: 'INSERT INTO tag (datum, typ, soll_override, notiz, blocker, bestaetigt) VALUES (?, ?, ?, ?, ?, ?)',
      args: [`2026-02-0${index + 1}`, typ, 360, 'Tag', index % 2, index % 2],
    })),
    ...['merker', 'daily', 'warten'].map((art, index) => ({
      sql: 'INSERT INTO todo (art, text, wer, nachfassen_am, aufgabe_id, konto_id, faellig_am, sortierung, erledigt_am) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)',
      args: [art, `Todo ${art}`, 'Tim', '2026-03-01', '2026-03-02', index, '2026-03-03T10:00:00.000Z'],
    })),
    { sql: 'INSERT INTO notiz (titel, inhalt, tags, aufgabe_id, konto_id, angepinnt) VALUES (\'Titel\', \'Inhalt\', \'["a","b"]\', 1, 1, 1)' },
    ...['grund', 'zusatz', 'rest'].map((art, index) => ({
      sql: 'INSERT INTO urlaubsanspruch (jahr, art, bezeichnung, tage) VALUES (2026, ?, ?, ?)',
      args: [art, `Posten ${art}`, index + 0.5],
    })),
    ...Object.entries(SETTINGS_BEFORE).map(([key, value]) => ({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      args: [key, JSON.stringify(value)],
    })),
  ]
  await client.batch(statements, 'write')
}

async function countsPerTable(tableNames: string[]) {
  const counts: Record<string, number> = {}
  for (const name of tableNames) counts[name] = Number((await rows(`SELECT count(*) AS c FROM ${name}`))[0]!.c)
  return counts
}

describe('migration 0003 -> latest', () => {
  it('keeps every row and maps every stored value, settings key and colour', async () => {
    await migrate(drizzle(client), { migrationsFolder: migrationsUpTo(LAST_GERMAN_MIGRATION_INDEX) })
    await insertGermanFixture()
    const before = await countsPerTable(['konto', 'aufgabe', 'vorlage', 'vorlage_ausnahme', 'block', 'tag', 'todo', 'notiz', 'urlaubsanspruch', 'settings'])

    await migrate(drizzle(client), { migrationsFolder: REAL_MIGRATIONS })

    const after = await countsPerTable(['account', 'task', 'template', 'template_exception', 'block', 'day', 'todo', 'note', 'vacation_entitlement', 'settings'])
    expect(Object.values(after)).toEqual(Object.values(before))

    expect((await rows('SELECT color FROM account ORDER BY id')).map(row => row.color)).toEqual(COLORS_AFTER)
    expect((await rows('SELECT status FROM account ORDER BY id')).map(row => row.status)).toEqual([...Array(7).fill('active'), 'archived'])
    expect((await rows('SELECT status FROM task ORDER BY id')).map(row => row.status)).toEqual(['open', 'closed'])
    expect(await rows('SELECT kind, status FROM block ORDER BY id')).toEqual([
      { kind: 'work', status: 'booked' },
      { kind: 'break', status: 'planned' },
    ])
    expect((await rows('SELECT type FROM day ORDER BY date')).map(row => row.type)).toEqual(['work', 'vacation', 'half_vacation', 'sick', 'flex_day'])
    expect((await rows('SELECT kind FROM todo ORDER BY id')).map(row => row.kind)).toEqual(['reminder', 'daily_topic', 'waiting_for'])
    expect((await rows('SELECT kind FROM vacation_entitlement ORDER BY id')).map(row => row.kind)).toEqual(['base', 'extra', 'carryover'])

    const settingsAfter = Object.fromEntries((await rows('SELECT key, value FROM settings')).map(row => [row.key, JSON.parse(String(row.value))]))
    expect(settingsAfter).toEqual(SETTINGS_AFTER)

    expect(await rows('SELECT template_id, date FROM template_exception')).toEqual([{ template_id: 1, date: '2026-01-12' }])
    expect(await rows('SELECT template_id, task_id, account_id, note FROM block WHERE id = 1')).toEqual([{ template_id: 1, task_id: 1, account_id: 1, note: 'Notiz' }])
    expect(await rows('SELECT person, follow_up_date, due_date, sort_order, done_at FROM todo WHERE id = 1')).toEqual([
      { person: 'Tim', follow_up_date: '2026-03-01', due_date: '2026-03-02', sort_order: 0, done_at: '2026-03-03T10:00:00.000Z' },
    ])
    expect(await rows('SELECT title, content, pinned FROM note')).toEqual([{ title: 'Titel', content: 'Inhalt', pinned: 1 }])
    expect(await rows('SELECT year, label, days FROM vacation_entitlement WHERE id = 3')).toEqual([{ year: 2026, label: 'Posten rest', days: 2.5 }])

    expect(await rows('PRAGMA foreign_key_check')).toEqual([])
    for (const { name } of await rows('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'\\_\\_%\' ESCAPE \'\\\' AND name NOT LIKE \'sqlite_%\'')) {
      for (const foreignKey of await rows(`PRAGMA foreign_key_list(${name})`)) {
        expect(['account', 'task', 'template']).toContain(foreignKey.table)
        expect(['id']).toContain(foreignKey.to)
      }
    }
  })
})

describe('migrations on an empty database', () => {
  it('create exactly the tables, columns and indexes of schema.ts', async () => {
    await migrate(drizzle(client), { migrationsFolder: REAL_MIGRATIONS })

    const tables = Object.values(schema).filter((value): value is SQLiteTable => is(value, SQLiteTable))
    expect(tables.length).toBe(10)
    for (const table of tables) {
      const config = getTableConfig(table)
      const actualColumns = (await rows(`PRAGMA table_info(${config.name})`)).map(row => row.name).sort()
      expect(actualColumns, config.name).toEqual(config.columns.map(column => column.name).sort())

      const actualIndexes = (await rows(`PRAGMA index_list(${config.name})`)).map(row => String(row.name)).filter(name => !name.startsWith('sqlite_autoindex')).sort()
      const expectedIndexes = [
        ...config.indexes.map(index => index.config.name),
        ...config.columns.filter(column => column.isUnique).map(column => `${config.name}_${column.name}_unique`),
      ].sort()
      expect(actualIndexes, config.name).toEqual(expectedIndexes)
    }

    const tableNames = (await rows('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' AND name NOT LIKE \'\\_\\_%\' ESCAPE \'\\\'')).map(row => row.name)
    expect(tableNames.sort()).toEqual(tables.map(table => getTableConfig(table).name).sort())
  })
})
