import { format, startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { toDate } from './time'
import type { IsoDate } from './time'

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
    .replace(/\[\[#\d+\s+([^\]\n]*)\]\]/g, '$1') // note reference -> its text
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

/** Same normalization as the quick input uses for task keys (trimmed, lowercased) */
export const normalizeTaskKey = (key: string) => key.trim().toLocaleLowerCase('de')

export type NoteReference
  = | { type: 'note', noteId: number, raw: string }
    /** `normalizedKey` is trimmed and lowercased; whether a task has this key is decided where the tasks are known */
    | { type: 'taskKey', normalizedKey: string, raw: string }

const REFERENCE_PATTERN = /\[\[([^[\]\r\n]*)\]\]/g
const NOTE_REFERENCE_PATTERN = /^#(\d+)(?:\s.*)?$/

/**
 * References in note text, in order of first appearance, without duplicates:
 * `[[#12 Text]]` (note 12) and `[[GB-114]]` (task key candidate). `raw` is the bracket text as typed.
 */
export function parseNoteReferences(content: string): NoteReference[] {
  const references: NoteReference[] = []
  const seen = new Set<string>()
  for (const match of content.matchAll(REFERENCE_PATTERN)) {
    const inner = match[1]!.trim()
    if (!inner) continue
    const noteMatch = NOTE_REFERENCE_PATTERN.exec(inner)
    const reference: NoteReference = noteMatch
      ? { type: 'note', noteId: Number(noteMatch[1]), raw: match[0] }
      : { type: 'taskKey', normalizedKey: normalizeTaskKey(inner), raw: match[0] }
    const identity = reference.type === 'note' ? `note:${reference.noteId}` : `taskKey:${reference.normalizedKey}`
    if (seen.has(identity)) continue
    seen.add(identity)
    references.push(reference)
  }
  return references
}

/** True when `content` has a `[[#<noteId> …]]` reference to exactly this note */
export function mentionsNote(content: string, noteId: number): boolean {
  return parseNoteReferences(content).some(reference => reference.type === 'note' && reference.noteId === noteId)
}

/** True when `content` has a `[[<key>]]` reference to exactly this key (case-insensitive) */
export function mentionsTaskKey(content: string, key: string): boolean {
  const normalizedKey = normalizeTaskKey(key)
  return parseNoteReferences(content).some(reference => reference.type === 'taskKey' && reference.normalizedKey === normalizedKey)
}

/** The text inserted for a note reference; brackets and line breaks are left out of the title so it always parses */
export function noteReferenceText(note: { id: number, title: string }): string {
  const title = note.title.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()
  return title ? `[[#${note.id} ${title}]]` : `[[#${note.id}]]`
}

export interface NoteListSection<T> {
  /** `pinned`, `today`, `week` or the month as `yyyy-MM` */
  key: string
  title: string
  notes: T[]
}

/**
 * Groups the notes list: pinned, today, earlier this week (Monday to Sunday), then one section per month,
 * newest first. `updatedDate` is the day of the last change. Keeps the incoming order within a section;
 * empty sections are left out.
 */
export function groupNotesForList<T extends { pinned: boolean, updatedDate: IsoDate }>(notes: T[], today: IsoDate): NoteListSection<T>[] {
  const weekStart = format(startOfWeek(toDate(today), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const pinned: T[] = []
  const todayNotes: T[] = []
  const weekNotes: T[] = []
  const months = new Map<string, T[]>()
  for (const note of notes) {
    if (note.pinned) pinned.push(note)
    else if (note.updatedDate >= today) todayNotes.push(note)
    else if (note.updatedDate >= weekStart) weekNotes.push(note)
    else {
      const month = note.updatedDate.slice(0, 7)
      months.set(month, [...(months.get(month) ?? []), note])
    }
  }
  const sections: NoteListSection<T>[] = [
    { key: 'pinned', title: 'Angepinnt', notes: pinned },
    { key: 'today', title: 'Heute', notes: todayNotes },
    { key: 'week', title: 'Diese Woche', notes: weekNotes },
    ...[...months.keys()].sort().reverse().map(month => ({
      key: month,
      title: format(toDate(`${month}-01`), 'LLLL yyyy', { locale: de }),
      notes: months.get(month)!,
    })),
  ]
  return sections.filter(section => section.notes.length)
}
