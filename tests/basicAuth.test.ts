import { describe, expect, it } from 'vitest'
import { isValidBasicAuth } from '../server/utils/basicAuth'

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`

describe('isValidBasicAuth', () => {
  it('accepts the correct password with any user', () => {
    expect(isValidBasicAuth(basic('egal:geheim'), 'geheim')).toBe(true)
    expect(isValidBasicAuth(basic(':geheim'), 'geheim')).toBe(true)
  })

  it('allows colons in the password', () => {
    expect(isValidBasicAuth(basic('u:ge:heim'), 'ge:heim')).toBe(true)
  })

  it('rejects a wrong password', () => {
    expect(isValidBasicAuth(basic('u:falsch'), 'geheim')).toBe(false)
    expect(isValidBasicAuth(basic('u:geheim2'), 'geheim')).toBe(false)
  })

  it('rejects missing or malformed headers', () => {
    expect(isValidBasicAuth(undefined, 'geheim')).toBe(false)
    expect(isValidBasicAuth('Bearer abc', 'geheim')).toBe(false)
    expect(isValidBasicAuth(basic('ohne-doppelpunkt'), 'geheim')).toBe(false)
  })
})
