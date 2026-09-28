import { settings } from '../db/schema'
import { db } from '../db/client'
import type { Einstellungen } from '#shared/utils/einstellungen'
import { einstellungenSchema, STANDARD_EINSTELLUNGEN } from '#shared/utils/einstellungen'
import { heute } from '#shared/utils/zeit'

/** Settings aus der DB, fehlende Werte mit Defaults aufgefüllt. Startdatum des Stundenkontos wird beim ersten Mal festgeschrieben. */
export async function ladeEinstellungen(): Promise<Einstellungen> {
  const zeilen = await db.select().from(settings)
  const gespeichert = Object.fromEntries(zeilen.map(z => [z.key, z.value]))

  if (!gespeichert.stundenkontoStart) {
    const start = { datum: heute(), saldoMin: 0 }
    await db.insert(settings).values({ key: 'stundenkontoStart', value: start }).onConflictDoNothing()
    gespeichert.stundenkontoStart = start
  }

  const ergebnis = einstellungenSchema.safeParse({ ...STANDARD_EINSTELLUNGEN, ...gespeichert })
  if (!ergebnis.success) {
    // Kaputte Einzelwerte nicht die ganze App blockieren lassen: nur gültige Schlüssel übernehmen
    const sauber: Record<string, unknown> = { ...STANDARD_EINSTELLUNGEN, stundenkontoStart: gespeichert.stundenkontoStart }
    for (const [key, value] of Object.entries(gespeichert)) {
      const feld = einstellungenSchema.shape[key as keyof Einstellungen]
      if (feld?.safeParse(value).success) sauber[key] = value
    }
    return einstellungenSchema.parse(sauber)
  }
  return ergebnis.data
}

export async function speichereEinstellungen(teil: Partial<Einstellungen>): Promise<Einstellungen> {
  const eintraege = Object.entries(teil).filter(([, value]) => value !== undefined)
  for (const [key, value] of eintraege) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  }
  return ladeEinstellungen()
}
