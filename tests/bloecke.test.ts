import { describe, expect, it } from 'vitest'
import {
  findeUeberlappung,
  geplantMinuten,
  istGueltigerZeitraum,
  istMinuten,
  naechsterFreierSlot,
  teileZeitraum,
  ueberlappt,
} from '../shared/utils/bloecke'
import type { BlockBasis } from '../shared/utils/bloecke'

const b = (start: number, ende: number, extra: Partial<BlockBasis> = {}): BlockBasis =>
  ({ datum: '2026-09-28', kind: 'arbeit', status: 'gebucht', start, ende, ...extra })

describe('Zeiträume', () => {
  it('prüft Gültigkeit', () => {
    expect(istGueltigerZeitraum({ start: 540, ende: 600 })).toBe(true)
    expect(istGueltigerZeitraum({ start: 600, ende: 600 })).toBe(false)
    expect(istGueltigerZeitraum({ start: 540, ende: 550 })).toBe(false)
    expect(istGueltigerZeitraum({ start: 1380, ende: 1455 })).toBe(false)
  })

  it('erkennt Überlappung, Kanten berühren ist erlaubt', () => {
    expect(ueberlappt({ start: 540, ende: 600 }, { start: 585, ende: 660 })).toBe(true)
    expect(ueberlappt({ start: 540, ende: 600 }, { start: 600, ende: 660 })).toBe(false)
  })

  it('ignoriert beim Verschieben den Block selbst', () => {
    const bloecke = [{ ...b(540, 600), id: 1 }, { ...b(600, 660), id: 2 }]
    expect(findeUeberlappung(bloecke, { start: 555, ende: 600 }, 1)).toBeUndefined()
    expect(findeUeberlappung(bloecke, { start: 555, ende: 615 }, 1)?.id).toBe(2)
  })

  it('teilt nur innerhalb und im Raster', () => {
    expect(teileZeitraum({ start: 540, ende: 660 }, 600)).toEqual([{ start: 540, ende: 600 }, { start: 600, ende: 660 }])
    expect(teileZeitraum({ start: 540, ende: 660 }, 540)).toBeUndefined()
    expect(teileZeitraum({ start: 540, ende: 660 }, 610)).toBeUndefined()
  })
})

describe('naechsterFreierSlot', () => {
  it('ohne Blöcke: Arbeitsbeginn', () => {
    expect(naechsterFreierSlot([], 480)).toBe(480)
  })

  it('sonst nach dem letzten Block', () => {
    expect(naechsterFreierSlot([b(540, 600), b(780, 840), b(600, 660)], 480)).toBe(840)
  })
})

describe('Ist/geplant', () => {
  it('zählt nur gebuchte Arbeit als Ist', () => {
    const bloecke = [
      b(480, 720),
      b(720, 750, { kind: 'pause' }),
      b(750, 900, { status: 'geplant' }),
    ]
    expect(istMinuten(bloecke)).toBe(240)
    expect(geplantMinuten(bloecke)).toBe(150)
  })
})
