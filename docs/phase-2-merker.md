# Phase 2 – Merker, Warten auf, Daily-Themen, Befehlspalette

Ein Eintragstyp „Todo“ mit drei Arten, globale `Strg+K`-Palette mit Schnelleingabe und Suche.

## Bedienung

### Befehlspalette – `Strg+K` / `⌘K` (von jeder Seite)
Auch über „Schnelleingabe“ oben in der Sidebar.
- **Ausführen:** alles, was die Schnelleingabe versteht (Zeit buchen/planen, Pausen, Merker …). Enter führt eine eindeutige Aktion sofort aus und schließt die Palette.
- **Suchen:** Text ohne Dauer/Präfix sucht (ab 2 Zeichen) in Aufgaben, Konten und offenen Einträgen; Pfeiltasten + Enter öffnen den Treffer.
- **Gehe zu:** alle Seiten.
- Auf „Heute“ gilt der angezeigte Tag, sonst heute.

### Schnelleingabe-Präfixe

| Eingabe | Ergebnis |
|---|---|
| `t Zertifikat verlängern` | Merker |
| `t Zertifikat verlängern bis fr` | Merker mit Fälligkeit |
| `d Deployment-Freeze ansprechen` | Daily-Thema |
| `w Tim: PR-Review Login` | Warten auf, *wer* = Text vor dem ersten `:` |
| `w Tim: PR-Review bis fr` / `bis 2026-10-02` | mit Nachfass-Datum |

**Abnahme:** Ein Merker ist von jeder Seite mit `Strg+K`, `t Text`, Enter erfasst.

### Merker & Daily (`/todos`)
- Drei Listen: **Merker · Warten auf · Daily-Themen**.
- Häkchen = erledigt (bei Daily-Themen „besprochen“), im Toast „Rückgängig“.
- **Warten auf:** Alter („seit 5 Tagen“); ab Nachfass-Datum hervorgehoben und oben. Wecker-Button „nachgefasst“ setzt das Nachfass-Datum auf +3 Arbeitstage.
- Sortieren per Drag & Drop (Griff links), Eingabefeld am Listenende (versteht `Tim: … bis fr`), Klick auf einen Eintrag öffnet den Bearbeiten-Dialog (Art, Text, wer, Nachfassen/Fällig, Bezug zu Aufgabe/Konto, Löschen).
- Unten einklappbar **„Besprochen / erledigt“** mit Datum, Wieder öffnen, Löschen.

### Auf „Heute“
- Karten unter der Timeline: **Merker** (alle offenen), **Warten auf** (alle offenen; fällige hervorgehoben, oben und im Kartenkopf gezählt: „2 nachfassen“), **Daily-Themen**. Alle Karten sind immer sichtbar.
- **Merker auf die Timeline ziehen** → geplanter 30-min-Block an der Drop-Position, Merker-Text als Block-Notiz. Hat der Merker keinen Bezug zu Aufgabe/Konto, öffnet sich der vorausgefüllte Block-Dialog zur Auswahl. Der Merker bleibt offen.
- Aufgaben-Detailseite zeigt die verknüpften Einträge.

## Fachregeln & Entscheidungen

Reine Funktionen in `shared/utils/todos.ts` und `quickInput.ts` (Tests: `tests/todos.test.ts`, `tests/quickInput.test.ts`).

- **Fälligkeit:** Warten auf ab `nachfassenAm`, Merker ab `faelligAm`, Daily-Themen nie.
- **Abweichung von Plan §5:** Auf „Heute“ zeigt die Karte *Warten auf* alle offenen Einträge statt nur der fälligen (Wunsch nach Phase 3).
- **Sortierung:** fällige/überfällige oben (ältester Stichtag zuerst), darunter manuelle Reihenfolge. Neue Einträge ans Ende ihrer Liste.
- **Nachgefasst:** +3 **Arbeitstage** (Wochenenden und Feiertage laut Einstellungen übersprungen).
- **Alter:** Kalendertage seit `erstelltAm` (lokale Zeitzone).
- `bis <datum>` wirkt bei `w` (Nachfassen) **und bei `t` (Fälligkeit)** – der Plan nennt es nur für `w`; bei `d` bleibt „bis …“ Teil des Texts. `bis` mit ungültigem Datum bleibt ebenfalls Text.
- Unpassende Felder werden serverseitig verworfen (`wer`/`nachfassenAm` nur bei warten, `faelligAm` nur bei merker).
- **Befehlspalette:** eigene Suchzeile über Rekas `ListboxFilter` statt shadcn-`CommandInput` – deren eingebauter Textfilter hätte Aktions- und Suchtreffer ausgeblendet. Übrige Teile sind unveränderte shadcn-Komponenten (`CommandDialog`, `CommandList`, `CommandGroup`, `CommandItem`).
- Enter wird bei eindeutiger Aktion abgefangen und direkt ausgeführt (unabhängig vom hervorgehobenen Eintrag, z. B. nach Einfügen).
- Schnelleingabe-Logik (Parsen, Vorschau, Ausführen) liegt im Composable `useSchnelleingabe` – genutzt von der Zeile auf „Heute“ und der Palette.
- Sortieren per Drag & Drop setzt Daten am Drag-Event (sonst startet Firefox nicht).

## Datenmodell & API

Tabelle `todo` (Plan §4): `art` (`merker` | `daily` | `warten`), `text`, `wer`, `nachfassenAm`, `faelligAm`, `aufgabeId`, `kontoId`, `sortierung`, `erledigtAm`, `erstelltAm`. Keine Migration nötig (seit Phase 0 im Schema).

| Route | Zweck |
|---|---|
| `GET /api/todos?art&status=offen\|erledigt&aufgabeId` | offene (nach Sortierung) oder erledigte (neueste zuerst) inkl. Bezug |
| `POST /api/todos` | anlegen (ans Ende der Liste) |
| `PATCH /api/todos/:id` | Felder ändern, `erledigt: true/false` |
| `DELETE /api/todos/:id` | löschen |
| `POST /api/todos/:id/nachgefasst` | neues Nachfass-Datum (`bis` oder +3 Arbeitstage) |
| `POST /api/todos/sortierung` | neue Reihenfolge als ID-Liste |
| `GET /api/suche?q` | Aufgaben, Konten, offene Todos (`LIKE`, Platzhalter maskiert) |

## Offen / bekannte Grenzen

- Nicht im Browser geprüft (Palette, Drag & Drop, Abnahme „2 Tastendrücke + Text“).
- Suche ist nur für ASCII-Buchstaben unabhängig von Groß-/Kleinschreibung (SQLite-`LIKE`): „Übung“ findet nicht „übung“.
- ~~Notizen in Suche und Palette, `n`-Präfix und angepinnte Notizen auf „Heute“~~ → umgesetzt in [Phase 3](phase-3-notizen.md).
- Nur Merker (nicht Warten auf/Daily-Themen) lassen sich auf die Timeline ziehen.
