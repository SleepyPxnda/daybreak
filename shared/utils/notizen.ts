/**
 * Tags aus freier Eingabe („Architektur, #ideen  backend“) → normalisierte, eindeutige Liste.
 * Kleinbuchstaben, ohne führendes „#“, Trenner: Komma und Leerraum. Reihenfolge bleibt erhalten.
 */
export function normalisiereTags(eingabe: string | string[]): string[] {
  const teile = Array.isArray(eingabe) ? eingabe.flatMap(t => t.split(/[,\s]+/)) : eingabe.split(/[,\s]+/)
  const tags: string[] = []
  for (const teil of teile) {
    const tag = teil.trim().replace(/^#+/, '').toLocaleLowerCase('de').slice(0, 40)
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

/** Kurzer Klartext-Ausschnitt aus Markdown für Listen (Markup grob entfernt). */
export function notizAusschnitt(inhalt: string, maxZeichen = 140): string {
  const text = inhalt
    .replace(/```[\s\S]*?```/g, ' ') // Codeblöcke
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // Bilder
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links → Linktext
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, ziel: string, alias?: string) => alias ?? ziel) // Obsidian-Wikilinks
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // Überschriften, Zitate, Listen
    .replace(/[*_`~]+/g, '') // Hervorhebungen, Inline-Code
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxZeichen ? `${text.slice(0, maxZeichen - 1).trimEnd()}…` : text
}
