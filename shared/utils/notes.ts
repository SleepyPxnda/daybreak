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

export type NoteKind = 'meeting' | 'problem' | 'info'

/** The three note kinds: plural `title` for section headings, `singular` for labels. */
export const NOTE_KINDS: { kind: NoteKind, title: string, singular: string }[] = [
  { kind: 'meeting', title: 'Meetings', singular: 'Meeting' },
  { kind: 'problem', title: 'Probleme', singular: 'Problem' },
  { kind: 'info', title: 'Infos', singular: 'Info' },
]

/** Order of the sections on the task page. */
const SECTION_ORDER: NoteKind[] = ['problem', 'info', 'meeting']

export interface NoteSection<T> {
  /** `null` = notes without a kind */
  kind: NoteKind | null
  title: string
  notes: T[]
}

/**
 * Groups notes into the task page sections: problems, infos, meetings, then notes without a kind.
 * Keeps the incoming order within a group. The three kind sections are always present;
 * the section without a kind only when it has notes.
 */
export function groupNotesByKind<T extends { kind: NoteKind | null }>(notes: T[]): NoteSection<T>[] {
  const sections: NoteSection<T>[] = SECTION_ORDER.map((kind) => {
    const definition = NOTE_KINDS.find(entry => entry.kind === kind)!
    return { kind, title: definition.title, notes: notes.filter(note => note.kind === kind) }
  })
  const withoutKind = notes.filter(note => note.kind == null)
  if (withoutKind.length) sections.push({ kind: null, title: 'Ohne Art', notes: withoutKind })
  return sections
}

export interface NoteValues {
  title: string
  content: string
  kind: NoteKind | null
  tags: string[]
  taskId: number | null
  accountId: number | null
  pinned: boolean
}

/** True when any field other than `pinned` differs - only then does "last changed" move. */
export function isContentChange(stored: NoteValues, next: NoteValues): boolean {
  return stored.title !== next.title
    || stored.content !== next.content
    || stored.kind !== next.kind
    || stored.taskId !== next.taskId
    || stored.accountId !== next.accountId
    || stored.tags.length !== next.tags.length
    || stored.tags.some((tag, index) => tag !== next.tags[index])
}
