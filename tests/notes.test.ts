import { describe, expect, it } from 'vitest'
import { groupNotesByKind, groupNotesForList, isContentChange, mentionsNote, mentionsTaskKey, normalizeTags, noteExcerpt, noteKindLabels, noteReferenceText, NOTE_KINDS, parseNoteReferences } from '../shared/utils/notes'
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

describe('noteKindLabels', () => {
  it('returns the labels of a kind', () => {
    expect(noteKindLabels('problem')).toEqual({ title: 'Probleme', singular: 'Problem' })
  })

  it('throws for an unknown kind', () => {
    expect(() => noteKindLabels('unknown' as NoteKind)).toThrow()
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

describe('parseNoteReferences (AC8)', () => {
  it('parses note references with and without text', () => {
    expect(parseNoteReferences('[[#12 Cache]]')).toEqual([{ type: 'note', noteId: 12, raw: '[[#12 Cache]]' }])
    expect(parseNoteReferences('[[#12]]')).toEqual([{ type: 'note', noteId: 12, raw: '[[#12]]' }])
  })

  it('parses a task key candidate, trimmed and lowercased', () => {
    expect(parseNoteReferences('[[ gb-114 ]]')).toEqual([{ type: 'taskKey', normalizedKey: 'gb-114', raw: '[[ gb-114 ]]' }])
  })

  it('collapses duplicates and keeps the order of first appearance', () => {
    const references = parseNoteReferences('[[GB-1]] [[#3 a]] [[gb-1]] [[#3 b]] [[#2]]')
    expect(references.map(reference => reference.type === 'note' ? `n${reference.noteId}` : reference.normalizedKey)).toEqual(['gb-1', 'n3', 'n2'])
  })

  it('treats [[Seite]] as a task key candidate', () => {
    expect(parseNoteReferences('[[Seite]]')).toEqual([{ type: 'taskKey', normalizedKey: 'seite', raw: '[[Seite]]' }])
  })

  it('ignores line breaks, unclosed and nested brackets', () => {
    expect(parseNoteReferences('[[a\nb]]')).toEqual([])
    expect(parseNoteReferences('[[x')).toEqual([])
    expect(parseNoteReferences('[[a [b] c]]')).toEqual([])
  })
})

describe('mentionsNote and mentionsTaskKey (AC11, AC12)', () => {
  it('matches the exact token, keys ignoring case', () => {
    expect(mentionsNote('siehe [[#12 Cache]]', 12)).toBe(true)
    expect(mentionsTaskKey('siehe [[gb-114]]', 'GB-114')).toBe(true)
    expect(mentionsTaskKey('[[gb-11]]', 'GB-11')).toBe(true)
  })

  it('does not match prefixes', () => {
    expect(mentionsTaskKey('[[GB-11]]', 'GB-114')).toBe(false)
    expect(mentionsTaskKey('[[GB-114]]', 'GB-11')).toBe(false)
    expect(mentionsNote('[[#120 Anderes]]', 12)).toBe(false)
  })

  it('does not match a bare key without brackets', () => {
    expect(mentionsTaskKey('GB-114 läuft', 'GB-114')).toBe(false)
  })
})

describe('noteReferenceText (AC9)', () => {
  it('leaves brackets out of the title and parses back', () => {
    const text = noteReferenceText({ id: 12, title: 'Fix [prod]' })
    expect(text).toBe('[[#12 Fix prod]]')
    expect(parseNoteReferences(text)).toMatchObject([{ type: 'note', noteId: 12 }])
  })

  it('keeps a long unbroken word and a long URL whole', () => {
    for (const title of ['Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichenhalter', 'https://example.com/a/very/long/path?with=query&and=more#fragment']) {
      const text = noteReferenceText({ id: 7, title })
      expect(text).toBe(`[[#7 ${title}]]`)
      expect(parseNoteReferences(text)).toMatchObject([{ type: 'note', noteId: 7 }])
    }
  })

  it('replaces line breaks', () => {
    expect(noteReferenceText({ id: 1, title: 'a\nb' })).toBe('[[#1 a b]]')
  })
})

describe('groupNotesForList (AC2)', () => {
  const note = (id: number, updatedDate: string, pinned = false) => ({ id, updatedDate, pinned })
  // 2026-11-25 is a Wednesday, the week starts on 2026-11-23
  const today = '2026-11-25'

  it('orders sections and puts a pinned old note first', () => {
    const sections = groupNotesForList([note(1, '2026-01-02', true), note(2, '2026-11-25'), note(3, '2026-11-23'), note(4, '2026-11-10'), note(5, '2026-10-30'), note(6, '2026-10-02')], today)
    expect(sections.map(section => section.title)).toEqual(['Angepinnt', 'Heute', 'Diese Woche', 'November 2026', 'Oktober 2026'])
    expect(sections.map(section => section.notes.map(entry => entry.id))).toEqual([[1], [2], [3], [4], [5, 6]])
  })

  it('puts yesterday into its month when today is a Monday', () => {
    const sections = groupNotesForList([note(1, '2026-11-22'), note(2, '2026-11-23')], '2026-11-23')
    expect(sections.map(section => section.title)).toEqual(['Heute', 'November 2026'])
  })

  it('omits empty sections and keeps the input order', () => {
    const sections = groupNotesForList([note(2, '2026-09-02'), note(1, '2026-09-20')], today)
    expect(sections).toHaveLength(1)
    expect(sections[0]!.title).toBe('September 2026')
    expect(sections[0]!.notes.map(entry => entry.id)).toEqual([2, 1])
  })

  it('sorts months newest first', () => {
    const sections = groupNotesForList([note(1, '2026-08-01'), note(2, '2026-10-01')], today)
    expect(sections.map(section => section.title)).toEqual(['Oktober 2026', 'August 2026'])
  })
})

describe('noteExcerpt references (AC14)', () => {
  it('shows a note reference as its text and a task reference as the key', () => {
    expect(noteExcerpt('siehe [[#12 Cache läuft voll]] und [[GB-114]]')).toBe('siehe Cache läuft voll und GB-114')
  })
})
