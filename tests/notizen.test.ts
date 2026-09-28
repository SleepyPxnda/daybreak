import { describe, expect, it } from 'vitest'
import { normalisiereTags, notizAusschnitt } from '../shared/utils/notizen'

describe('normalisiereTags', () => {
  it('trennt an Komma und Leerraum, entfernt #, macht klein, dedupliziert', () => {
    expect(normalisiereTags('Architektur, #ideen  backend,IDEEN')).toEqual(['architektur', 'ideen', 'backend'])
  })

  it('akzeptiert Arrays und leere Eingaben', () => {
    expect(normalisiereTags(['a b', '#c'])).toEqual(['a', 'b', 'c'])
    expect(normalisiereTags('  , ')).toEqual([])
  })

  it('behält Umlaute', () => {
    expect(normalisiereTags('Übergabe')).toEqual(['übergabe'])
  })
})

describe('notizAusschnitt', () => {
  it('entfernt Markdown-Markup', () => {
    const md = '# Titel\n\n- **fett** und _kursiv_\n- [Link](https://x.de) und [[Seite|Alias]]\n\n```ts\ncode()\n```\n> Zitat `inline`'
    expect(notizAusschnitt(md)).toBe('Titel fett und kursiv Link und Alias Zitat inline')
  })

  it('kürzt mit Auslassungszeichen', () => {
    expect(notizAusschnitt('a'.repeat(200), 10)).toBe(`${'a'.repeat(9)}…`)
  })
})
