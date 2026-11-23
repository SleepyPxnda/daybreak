# Phase 3 – Notes

> The Markdown editor and preview described here were replaced by a plain text field; see "Notes: kinds and task notes" in [SPEC.md](SPEC.md).

Markdown notes with live preview, tags, search, pinning and a link to a task/account.

## Usage

### Notes (`/notes`)
- **Left:** search (title and content), tag filter (chips with a count, clicking again removes the filter), list with an excerpt, date, link and tags. Pinned ones come first, then the most recently changed. `+` creates a new note.
- **Right – editor:** title, tags (separated by comma/space, `#` optional), link to a task or account, markdown text field on the left, **live preview** on the right (stacked on narrow screens).
- **Autosave:** 0.8 s after the last change, immediately with `Ctrl+S`, when switching to another note and when leaving the page. Status at the top right: "Gespeichert · 14:32", "Ungespeichert", "Speichert …", "Speichern fehlgeschlagen" (saved, unsaved, saving, saving failed).
- **Pin** (pin icon) → appears on "Heute". **Delete** with a confirmation.
- Direct link to a note: `/notes?id=<id>`, tag filter: `?tag=<tag>`.

### New note
| Where | How |
|---|---|
| quick input / `Ctrl+K` | `n Architektur-Idee` → creates the note and opens the editor |
| notes page | `+` |
| task detail | "Notiz" → a new note with the task title, already linked |

### Other places
- **Heute:** card "Notizen" with the pinned notes (only if there are any).
- **Task detail:** linked notes.
- **`Ctrl+K` search** finds notes by title and content (title hits first).

## Business rules & decisions

- **Markdown:** `markdown-it` without raw HTML (plain markdown, Obsidian-compatible), line breaks are taken over as in Obsidian (`breaks`), links are detected automatically and open in a new tab. The output is additionally sanitized with **DOMPurify**. The preview is rendered only in the browser (DOMPurify needs a DOM).
- Obsidian wikilinks `[[Page]]` stay as text (no linking between notes in v1). Superseded: `[[#<id> …]]` and `[[<task key>]]` are now references, see [SPEC.md](SPEC.md) "References"; other bracket text stays plain text.
- **Tags** (`shared/utils/notes.ts`): lowercase, without `#`, unique, at most 40 characters; umlauts stay.
- **Excerpt** for lists: markdown roughly stripped, at most 140 characters.
- **"Geändert am" (updated at)** is updated only for changes to the content – pinning alone does not move a note in the list.
- An empty title is saved as "Ohne Titel" (untitled).
- Autosave compares the normalized state with the last saved one – only real changes trigger a save.
- Preview styles as slim `.markdown` rules in `main.css` over the theme tokens (no typography plugin).

## Data model & API

Table `note`: `title`, `content`, `tags` (JSON array), `taskId`, `accountId`, `pinned`, `createdAt`, `updatedAt`. No migration needed.

| Route | Purpose |
|---|---|
| `GET /api/notes?q&tag&taskId&accountId&pinned=1` | list with `excerpt` instead of content, max. 300; tag filter via `json_each` |
| `GET /api/notes/tags` | all tags with a count |
| `GET /api/notes/:id` | complete note |
| `POST /api/notes` | create (only `title` required) |
| `PATCH /api/notes/:id` | change (the link is resolved as for blocks: the task determines the account) |
| `DELETE /api/notes/:id` | delete |
| `GET /api/search?q` | now including `notes` |

Tests: `tests/notes.test.ts`, `n` prefix in `tests/quickInput.test.ts`.

## Open / known limits

- Not checked in the browser (editor, autosave, preview).
- Search via `LIKE`: case-insensitive only for ASCII; FTS5 is left for later.
- No export to Obsidian (optional later).
- If the browser tab is closed within 0.8 s after the last input, the last change can be lost (no `beforeunload` save).
