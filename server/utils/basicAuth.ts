import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Prüft einen `Authorization: Basic …`-Header gegen das erwartete Passwort.
 * Benutzername ist beliebig. Vergleich timing-safe über SHA-256-Digests (gleiche Länge).
 */
export function isValidBasicAuth(header: string | undefined, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  if (separator === -1) return false
  const given = createHash('sha256').update(decoded.slice(separator + 1)).digest()
  const expected = createHash('sha256').update(password).digest()
  return timingSafeEqual(given, expected)
}
