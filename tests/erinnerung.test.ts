import { describe, expect, it } from 'vitest'
import { pruefeErinnerung } from '../shared/utils/erinnerung'
import type { ErinnerungEingabe } from '../shared/utils/erinnerung'

const gebucht = (start: number, ende: number) => ({ start, ende, kind: 'arbeit' as const, status: 'gebucht' as const })
const geplant = (start: number, ende: number) => ({ start, ende, kind: 'arbeit' as const, status: 'geplant' as const })

// Arbeitsbeginn 08:00, Soll 8h, Lücke 2h, Feierabend 16:30
const basis: ErinnerungEingabe = {
  jetzt: 600,
  sollMin: 480,
  bloecke: [],
  arbeitsbeginn: 480,
  lueckeMin: 120,
  feierabend: 990,
  zuletzt: {},
}
const mit = (teil: Partial<ErinnerungEingabe>) => pruefeErinnerung({ ...basis, ...teil })

describe('pruefeErinnerung', () => {
  it('schweigt an Tagen ohne Soll', () => {
    expect(mit({ sollMin: 0, jetzt: 1100 })).toBeNull()
  })

  it('schweigt vor Arbeitsbeginn + Lücke', () => {
    expect(mit({ jetzt: 599 })).toBeNull()
  })

  it('erinnert, wenn seit Arbeitsbeginn nichts gebucht ist', () => {
    const e = mit({ jetzt: 600 })
    expect(e?.art).toBe('luecke')
    expect(e?.text).toContain('noch nichts gebucht')
  })

  it('misst die Lücke ab dem Ende des letzten gebuchten Blocks', () => {
    expect(mit({ jetzt: 700, bloecke: [gebucht(480, 600)] })).toBeNull()
    const e = mit({ jetzt: 720, bloecke: [gebucht(480, 600)] })
    expect(e?.art).toBe('luecke')
    expect(e?.text).toContain('10:00')
  })

  it('zählt geplante Blöcke nicht als gebucht', () => {
    expect(mit({ jetzt: 720, bloecke: [geplant(480, 720)] })?.art).toBe('luecke')
  })

  it('wiederholt die Lücken-Erinnerung frühestens nach einem Intervall', () => {
    expect(mit({ jetzt: 700, zuletzt: { luecke: 600 } })).toBeNull()
    expect(mit({ jetzt: 720, zuletzt: { luecke: 600 } })?.art).toBe('luecke')
  })

  it('schweigt, wenn das Soll schon erfüllt ist', () => {
    expect(mit({ jetzt: 900, bloecke: [gebucht(240, 720)] })).toBeNull()
    expect(mit({ jetzt: 1100, bloecke: [gebucht(240, 720)] })).toBeNull()
  })

  it('erinnert ab Feierabend an fehlende Zeit', () => {
    const e = mit({ jetzt: 990, bloecke: [gebucht(480, 855)] })
    expect(e?.art).toBe('feierabend')
    expect(e?.text).toContain('6:15 von 8:00')
  })

  it('erinnert zum Feierabend höchstens zweimal: zur Uhrzeit und eine Stunde später', () => {
    const bloecke = [gebucht(480, 900)]
    expect(mit({ jetzt: 1000, bloecke, zuletzt: { feierabend: 990 } })).toBeNull()
    expect(mit({ jetzt: 1050, bloecke, zuletzt: { feierabend: 990 } })?.art).toBe('feierabend')
    expect(mit({ jetzt: 1200, bloecke, zuletzt: { feierabend: 1050 } })).toBeNull()
  })

  it('erinnert nach Feierabend nicht mehr an Lücken', () => {
    expect(mit({ jetzt: 1100, bloecke: [gebucht(480, 600)], zuletzt: { feierabend: 1050 } })).toBeNull()
  })
})
