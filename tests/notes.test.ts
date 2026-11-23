import { describe, expect, it } from 'vitest'
import { groupNotesByKind, isContentChange, normalizeTags, noteExcerpt, NOTE_KINDS } from '../shared/utils/notes'
import type { NoteKind, NoteValues } from '../shared/utils/notes'

describe('normalizeTags', () => {
  it('splits on comma and whitespace, strips #, lowercases, deduplicates', () => {
    expect(normalizeTags('Architektur, #ideen  backend,IDEEN')).toEqual(['architektur', 'ideen', 'backend'])
  })

  it('accepts arrays and empty input', () => {
    expect(normalizeTags(['a b', '#c'])).toEqual(['a', 'b', 'c'])
    expect(normalizeTags('  , ')).toEqual([])
  })

  it('keeps umlauts', () => {
    expect(normalizeTags('Übergabe')).toEqual(['übergabe'])
  })
})

describe('noteExcerpt', () => {
  it('strips markdown markup', () => {
    const md = '# Titel\n\n- **fett** und _kursiv_\n- [Link](https://x.de) und [[Seite|Alias]]\n\n```ts\ncode()\n```\n> Zitat `inline`'
    expect(noteExcerpt(md)).toBe('Titel fett und kursiv Link und Alias Zitat inline')
  })

  it('truncates with an ellipsis', () => {
    expect(noteExcerpt('a'.repeat(200), 10)).toBe(`${'a'.repeat(9)}…`)
  })
})

describe('NOTE_KINDS', () => {
  it('covers exactly meeting, problem and info with their labels', () => {
    expect(NOTE_KINDS).toEqual([
      { kind: 'meeting', title: 'Meetings', singular: 'Meeting' },
      { kind: 'problem', title: 'Probleme', singular: 'Problem' },
      { kind: 'info', title: 'Infos', singular: 'Info' },
    ])
  })
})

describe('groupNotesByKind', () => {
  const note = (id: number, kind: NoteKind | null) => ({ id, kind })

  it('orders sections problems, infos, meetings, then without kind; keeps input order in a group', () => {
    const sections = groupNotesByKind([note(1, null), note(2, 'meeting'), note(3, 'problem'), note(4, 'info'), note(5, 'problem'), note(6, null)])
    expect(sections.map(section => section.title)).toEqual(['Probleme', 'Infos', 'Meetings', 'Ohne Art'])
    expect(sections.map(section => section.notes.map(entry => entry.id))).toEqual([[3, 5], [4], [2], [1, 6]])
    expect(sections.map(section => section.kind)).toEqual(['problem', 'info', 'meeting', null])
  })

  it('has the three kind sections when empty and no section without kind', () => {
    const sections = groupNotesByKind([])
    expect(sections.map(section => section.title)).toEqual(['Probleme', 'Infos', 'Meetings'])
    expect(sections.every(section => section.notes.length === 0)).toBe(true)
  })
})

describe('isContentChange', () => {
  const stored: NoteValues = { title: 'T', content: 'C', kind: null, tags: ['a', 'b'], taskId: 5, accountId: 2, pinned: false }

  it('is false for identical values and for a pin-only change', () => {
    expect(isContentChange(stored, { ...stored })).toBe(false)
    expect(isContentChange(stored, { ...stored, tags: ['a', 'b'], pinned: true })).toBe(false)
  })

  it.each([
    ['title', { title: 'X' }],
    ['content', { content: 'X' }],
    ['tags', { tags: ['a'] }],
    ['tag order', { tags: ['b', 'a'] }],
    ['kind', { kind: 'info' as const }],
    ['task', { taskId: 6 }],
    ['account', { accountId: 3 }],
  ])('is true when %s changes', (_name, change) => {
    expect(isContentChange(stored, { ...stored, ...change })).toBe(true)
  })
})
