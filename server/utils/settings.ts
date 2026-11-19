import { settings } from '../db/schema'
import { db } from '../db/client'
import type { Settings } from '#shared/utils/settings'
import { settingsSchema, DEFAULT_SETTINGS } from '#shared/utils/settings'
import { today } from '#shared/utils/time'

/** Settings from the DB, missing values filled with defaults. The balance start date is fixed on first use. */
export async function loadSettings(): Promise<Settings> {
  const rows = await db.select().from(settings)
  const saved = Object.fromEntries(rows.map(z => [z.key, z.value]))

  if (!saved.stundenkontoStart) {
    const start = { datum: today(), saldoMin: 0 }
    await db.insert(settings).values({ key: 'stundenkontoStart', value: start }).onConflictDoNothing()
    saved.stundenkontoStart = start
  }

  const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...saved })
  if (!result.success) {
    // Do not let single broken values block the whole app: only accept valid keys
    const clean: Record<string, unknown> = { ...DEFAULT_SETTINGS, stundenkontoStart: saved.stundenkontoStart }
    for (const [key, value] of Object.entries(saved)) {
      const field = settingsSchema.shape[key as keyof Settings]
      if (field?.safeParse(value).success) clean[key] = value
    }
    return settingsSchema.parse(clean)
  }
  return result.data
}

export async function saveSettings(part: Partial<Settings>): Promise<Settings> {
  const entries = Object.entries(part).filter(([, value]) => value !== undefined)
  for (const [key, value] of entries) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  }
  return loadSettings()
}
