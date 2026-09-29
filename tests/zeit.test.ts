import { describe, expect, it } from 'vitest'
import {
  aufRaster,
  datumsBereich,
  formatDauer,
  formatDezimal,
  formatSaldo,
  formatUhrzeit,
  istDatum,
  istImRaster,
  parseUhrzeit,
  plusTage,
  tageZwischen,
  wochentag,
} from '../shared/utils/zeit'

describe('zeit', () => {
  it('prüft Datumsformat', () => {
    expect(istDatum('2026-09-28')).toBe(true)
    expect(istDatum('2026-9-28')).toBe(false)
    expect(istDatum('2026-13-01')).toBe(false)
  })

  it('rechnet mit Tagen über Monats- und Jahresgrenzen', () => {
    expect(plusTage('2026-12-31', 1)).toBe('2027-01-01')
    expect(plusTage('2026-03-01', -1)).toBe('2026-02-28')
    expect(tageZwischen('2026-09-28', '2026-10-05')).toBe(7)
    // Zeitumstellung (25.10.2026) verschiebt keine Tage
    expect(plusTage('2026-10-24', 2)).toBe('2026-10-26')
  })

  it('liefert ISO-Wochentage', () => {
    expect(wochentag('2026-09-28')).toBe(1) // Montag
    expect(wochentag('2026-10-04')).toBe(7) // Sonntag
  })

  it('listet Datumsbereiche inklusive', () => {
    expect(datumsBereich('2026-09-30', '2026-10-02')).toEqual(['2026-09-30', '2026-10-01', '2026-10-02'])
    expect(datumsBereich('2026-10-02', '2026-10-01')).toEqual([])
  })

  it('arbeitet im 15-min-Raster', () => {
    expect(istImRaster(570)).toBe(true)
    expect(istImRaster(575)).toBe(false)
    expect(aufRaster(577)).toBe(570)
    expect(aufRaster(578)).toBe(585)
  })

  it('liest Uhrzeiten', () => {
    expect(parseUhrzeit('09:30')).toBe(570)
    expect(parseUhrzeit('9:30')).toBe(570)
    expect(parseUhrzeit('24:00')).toBe(1440)
    expect(parseUhrzeit('24:15')).toBeUndefined()
    expect(parseUhrzeit('9:75')).toBeUndefined()
    expect(parseUhrzeit('abc')).toBeUndefined()
  })

  it('formatiert Uhrzeit, Dauer und Saldo', () => {
    expect(formatUhrzeit(570)).toBe('09:30')
    expect(formatUhrzeit(0)).toBe('00:00')
    expect(formatDauer(330)).toBe('5:30')
    expect(formatDauer(-30)).toBe('-0:30')
    expect(formatSaldo(195)).toBe('+3:15')
    expect(formatSaldo(-30)).toBe('-0:30')
    expect(formatSaldo(0)).toBe('±0:00')
  })

  it('formatiert Dauer und Saldo in Dezimalstunden', () => {
    expect(formatDezimal(75)).toBe('1,25')
    expect(formatDezimal(150)).toBe('2,5')
    expect(formatDezimal(480)).toBe('8')
    expect(formatDezimal(0)).toBe('0')
    expect(formatDezimal(20)).toBe('0,33')
    expect(formatDezimal(-30)).toBe('-0,5')
    expect(formatSaldo(195, formatDezimal)).toBe('+3,25')
    expect(formatSaldo(-45, formatDezimal)).toBe('-0,75')
    expect(formatSaldo(0, formatDezimal)).toBe('±0')
  })
})
