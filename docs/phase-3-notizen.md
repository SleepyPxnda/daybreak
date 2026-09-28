# Phase 3 – Notizen

Markdown-Notizen mit Live-Vorschau, Tags, Suche, Anpinnen und Bezug zu Aufgabe/Konto.

## Bedienung

### Notizen (`/notizen`)
- **Links:** Suche (Titel und Inhalt), Tag-Filter (Chips mit Anzahl, erneuter Klick hebt den Filter auf), Liste mit Ausschnitt, Datum, Bezug und Tags. Angepinnte stehen oben, danach zuletzt geänderte. `+` legt eine neue Notiz an.
- **Rechts – Editor:** Titel, Tags (durch Komma/Leerzeichen getrennt, `#` optional), Bezug zu Aufgabe oder Konto, Markdown-Textfeld links, **Live-Vorschau** rechts (auf schmalen Bildschirmen untereinander).
- **Autosave:** 0,8 s nach der letzten Änderung, sofort mit `Strg+S`, beim Wechsel zu einer anderen Notiz und beim Verlassen der Seite. Status oben rechts: „Gespeichert · 14:32“, „Ungespeichert“, „Speichert …“, „Speichern fehlgeschlagen“.
- **Anpinnen** (Pin-Symbol) → erscheint auf „Heute“. **Löschen** mit Rückfrage.
- Direktlink auf eine Notiz: `/notizen?id=<id>`, Tag-Filter: `?tag=<tag>`.

### Neue Notiz
| Wo | Wie |
|---|---|
| Schnelleingabe / `Strg+K` | `n Architektur-Idee` → legt die Notiz an und öffnet den Editor |
| Notizen-Seite | `+` |
| Aufgaben-Detail | „Notiz“ → neue Notiz mit dem Aufgabentitel, bereits verknüpft |

### Weitere Stellen
- **Heute:** Karte „Notizen“ mit den angepinnten Notizen (nur wenn es welche gibt).
- **Aufgaben-Detail:** verknüpfte Notizen.
- **`Strg+K`-Suche** findet Notizen über Titel und Inhalt (Titeltreffer zuerst).

## Fachregeln & Entscheidungen

- **Markdown:** `markdown-it` ohne Roh-HTML (reines Markdown, Obsidian-kompatibel, Plan §3.7), Zeilenumbrüche werden wie in Obsidian übernommen (`breaks`), Links werden automatisch erkannt und öffnen in neuem Tab. Ausgabe zusätzlich mit **DOMPurify** bereinigt. Die Vorschau wird nur im Browser gerendert (DOMPurify braucht ein DOM).
- Obsidian-Wikilinks `[[Seite]]` bleiben als Text stehen (keine Verlinkung zwischen Notizen in v1).
- **Tags** (`shared/utils/notizen.ts`): klein geschrieben, ohne `#`, eindeutig, max. 40 Zeichen; Umlaute bleiben.
- **Ausschnitt** für Listen: Markdown grob entfernt, max. 140 Zeichen.
- **„Geändert am“** wird nur bei inhaltlichen Änderungen aktualisiert – Anpinnen allein verschiebt eine Notiz nicht in der Liste.
- Leerer Titel wird als „Ohne Titel“ gespeichert.
- Autosave vergleicht den normalisierten Stand mit dem zuletzt gespeicherten – nur echte Änderungen lösen ein Speichern aus.
- Vorschau-Styles als schlanke `.markdown`-Regeln in `main.css` über die Theme-Tokens (kein Typography-Plugin).

## Datenmodell & API

Tabelle `notiz` (Plan §4): `titel`, `inhalt`, `tags` (JSON-Array), `aufgabeId`, `kontoId`, `angepinnt`, `erstelltAm`, `geaendertAm`. Keine Migration nötig.

| Route | Zweck |
|---|---|
| `GET /api/notizen?q&tag&aufgabeId&kontoId&angepinnt=1` | Liste mit `ausschnitt` statt Inhalt, max. 300; Tag-Filter über `json_each` |
| `GET /api/notizen/tags` | alle Tags mit Anzahl |
| `GET /api/notizen/:id` | vollständige Notiz |
| `POST /api/notizen` | anlegen (nur `titel` Pflicht) |
| `PATCH /api/notizen/:id` | ändern (Bezug wird wie bei Blöcken aufgelöst: Aufgabe bestimmt das Konto) |
| `DELETE /api/notizen/:id` | löschen |
| `GET /api/suche?q` | jetzt inkl. `notizen` |

Tests: `tests/notizen.test.ts`, `n`-Präfix in `tests/quickInput.test.ts`.

## Offen / bekannte Grenzen

- Nicht im Browser geprüft (Editor, Autosave, Vorschau).
- Suche per `LIKE`: Groß-/Kleinschreibung nur für ASCII egal; FTS5 bleibt für später (Plan §10).
- Kein Export nach Obsidian (Plan §10, optional später).
- Beim Schließen des Browser-Tabs innerhalb von 0,8 s nach der letzten Eingabe kann die letzte Änderung verloren gehen (kein `beforeunload`-Speichern).
