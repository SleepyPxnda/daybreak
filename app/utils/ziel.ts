/** Ziel eines Blocks/einer Vorlage als Select-Wert: 'a:12' (Aufgabe) oder 'k:3' (direkt aufs Konto). */
export function zielWert(z: { aufgabeId?: number | null, kontoId?: number | null }): string {
  if (z.aufgabeId) return `a:${z.aufgabeId}`
  if (z.kontoId) return `k:${z.kontoId}`
  return ''
}

export function zielAusWert(wert: string): { aufgabeId: number | null, kontoId: number | null } {
  const [typ, id] = wert.split(':')
  const n = Number(id)
  if (typ === 'a' && n) return { aufgabeId: n, kontoId: null }
  if (typ === 'k' && n) return { aufgabeId: null, kontoId: n }
  return { aufgabeId: null, kontoId: null }
}
