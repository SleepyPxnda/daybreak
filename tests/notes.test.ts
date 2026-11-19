import { describe, expect, it } from 'vitest'
import { normalizeTags, noteExcerpt } from '../shared/utils/notes'

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
