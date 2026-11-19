/**
 * Tags from free input ("architecture, #ideas  backend") -> normalized, unique list.
 * Lowercase, without leading "#", separators: comma and whitespace. Order is preserved.
 */
export function normalizeTags(input: string | string[]): string[] {
  const split = Array.isArray(input) ? input.flatMap(t => t.split(/[,\s]+/)) : input.split(/[,\s]+/)
  const tags: string[] = []
  for (const part of split) {
    const tag = part.trim().replace(/^#+/, '').toLocaleLowerCase('de').slice(0, 40)
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

/** Short plain-text excerpt from Markdown for lists (markup roughly removed). */
export function noteExcerpt(content: string, maxCharacters = 140): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ') // code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, assignment: string, alias?: string) => alias ?? assignment) // Obsidian wikilinks
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // headings, quotes, lists
    .replace(/[*_`~]+/g, '') // emphasis, inline code
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxCharacters ? `${text.slice(0, maxCharacters - 1).trimEnd()}…` : text
}
