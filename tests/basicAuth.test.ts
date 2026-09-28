import { describe, expect, it } from 'vitest'
import { isValidBasicAuth } from '../server/utils/basicAuth'

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`

describe('isValidBasicAuth', () => {
  it('akzeptiert das richtige Passwort mit beliebigem Benutzer', () => {
    expect(isValidBasicAuth(basic('egal:geheim'), 'geheim')).toBe(true)
    expect(isValidBasicAuth(basic(':geheim'), 'geheim')).toBe(true)
  })

  it('erlaubt Doppelpunkte im Passwort', () => {
    expect(isValidBasicAuth(basic('u:ge:heim'), 'ge:heim')).toBe(true)
  })

  it('lehnt falsches Passwort ab', () => {
    expect(isValidBasicAuth(basic('u:falsch'), 'geheim')).toBe(false)
    expect(isValidBasicAuth(basic('u:geheim2'), 'geheim')).toBe(false)
  })

  it('lehnt fehlende oder kaputte Header ab', () => {
    expect(isValidBasicAuth(undefined, 'geheim')).toBe(false)
    expect(isValidBasicAuth('Bearer abc', 'geheim')).toBe(false)
    expect(isValidBasicAuth(basic('ohne-doppelpunkt'), 'geheim')).toBe(false)
  })
})
