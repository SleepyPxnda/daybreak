# Daybreak – Implementierungsplan

Persönliches Arbeits-Dashboard für den Arbeitsalltag: Zeit planen und buchen, Stundenkonto, Urlaub, Merker, Daily-Themen, Notizen.
Single-User, lokal oder als Docker-Container selbst gehostet. Kein Kanban, kein Issue-System.

> Stand: 2026-09-28 · Status: abgestimmt, bereit zur Umsetzung
> Mit **[Annahme]** markierte Punkte sind nicht explizit bestätigt – bei Zweifel nachfragen.

---

## 1. Ziele & Nicht-Ziele

**Ziele**
- Zeit **ohne Start/Stop** erfassen: planen und buchen über eine Tages-Timeline + eine Schnelleingabe-Zeile.
- Jederzeit sehen: Wie viel vom 8h-Soll ist heute gebucht, wie steht das Stundenkonto.
- Dinge, die man „nebenbei im Kopf haben sollte“, und Themen fürs nächste Daily sofort festhalten können.
- Notizen schreiben und verwalten.
- Urlaub, Feiertage (Baden-Württemberg), Krank- und Gleittage im Blick.

**Nicht-Ziele**
- Kein Kanban-Board, kein Issue-/Ticketsystem, keine Ticket-Integration (Stories werden von Hand angelegt).
- Kein Export ins Firmensystem. Eine gruppierte Übersicht reicht.
- Keine Prüfung gesetzlicher Pausenregeln (macht das interne Firmentool).
- Kein Multi-User, keine Benutzerverwaltung (höchstens ein optionaler Zugangsschutz, siehe §9).

---

## 2. Stack

| Bereich | Wahl | Hinweis |
|---|---|---|
| Framework | **Nuxt 4** (TypeScript, `app/`-Verzeichnis) | läuft lokal via `pnpm dev` |
| UI | **shadcn-vue** (Reka UI) + **Tailwind CSS v4** | Komponenten per CLI/MCP hinzufügen |
| Icons | `lucide-vue-next` | Standard bei shadcn-vue |
| DB | **SQLite** über **Drizzle ORM** + `@libsql/client` | libsql statt better-sqlite3 → keine native Kompilierung auf Windows nötig |
| Migrationen | `drizzle-kit` | DB-Pfad über `DATABASE_URL`, Default `file:./data/daybreak.db` (in `.gitignore`) |
| Deployment | **Docker** (Multi-Stage) + **GitHub Actions** | Image auf GHCR, siehe §9 |
| Datum | `date-fns` (+ `date-fns/locale/de`) | Woche beginnt Montag |
| Feiertage | `feiertagejs` | Bundesland `BW` |
| Markdown | `markdown-it` + `DOMPurify` | Notizen-Vorschau |
| Validierung | `zod` | Server-Routen + Parser |
| Tests | `vitest` | Pflicht für Parser + Saldo-Logik + Vorlagen-Materialisierung |
| Paketmanager | `pnpm` | |

### Dev-Tooling (offiziell)
- **Nuxt MCP** (Doku, Module): `claude mcp add --transport http nuxt https://nuxt.com/mcp` – bereits in `.mcp.json` eingetragen.
- **shadcn-vue MCP** (Komponenten suchen/installieren): `npx shadcn-vue@latest mcp` – bereits in `.mcp.json`. Alternativ `pnpm dlx shadcn-vue@latest mcp init --client claude`.
- **shadcn-vue Skill**: `pnpm dlx skills add unovue/shadcn-vue` – nach `shadcn-vue init` ausführen (braucht `components.json`).

---

## 3. Kernkonzepte & Fachlogik

### 3.1 Konten, Aufgaben, Blöcke – die Hierarchie

```
Konto 1 (Sammlung, z. B. „Projekt Apollo“)
 ├─ Aufgabe A  „PROJ-123 Login-Refactoring“
 │    ├─ Block  Mo 09:00–14:00  (5h)
 │    └─ Block  Di 09:00–14:00  (5h)   → A gesamt: 10h
 └─ Aufgabe C  …
Konto 2 („Wartung“)
 └─ Aufgabe B  …
Konto 3 („Firmenmeeting“)          ← abstraktes Konto, Blöcke ohne Aufgabe
 └─ Block  Mo 15:00–16:00
```

**Konto** – eine Sammlung, auf die Zeit läuft (Projekt, Kostenstelle, oder abstrakt wie „Firmenmeeting“, „Weiterbildung“).
- Name, Pastellfarbe aus der Palette (§6), optional Aliase für die Schnelleingabe (z. B. `mtg` → Firmenmeeting), Status `aktiv | archiviert`.

**Aufgabe** – eine Story/Aufgabe, gehört zu genau **einem** Konto.
- optional Key (z. B. `PROJ-123`), Titel, Status `offen | abgeschlossen`, optional Schätzung in Stunden.
- Zeigt die Summe aller gebuchten (und geplanten) Blöcke über alle Tage; mit Schätzung zusätzlich einen Fortschrittsbalken.
- Eine Aufgabe kann beliebig viele Blöcke an beliebig vielen Tagen haben (heute 5h, morgen 5h …).
- Abgeschlossene Aufgaben und archivierte Konten tauchen nicht mehr in Vorschlägen auf, bleiben aber in Auswertungen.

### 3.2 Blöcke (Zeiteinträge)
Ein **Block** liegt auf der Timeline eines Tages:
- `kind`: `arbeit | pause`
- `status`: `geplant | gebucht`
- `start`, `ende` in Minuten seit Mitternacht, Raster **15 min**
- `aufgabeId` optional – der Normalfall. Das Konto ergibt sich daraus.
- `kontoId` – Pflicht bei `arbeit`, leer bei `pause`. Ist `aufgabeId` gesetzt, muss `kontoId` dem Konto der Aufgabe entsprechen (Server erzwingt das; beim Verschieben einer Aufgabe in ein anderes Konto werden ihre Blöcke mitgezogen). Ohne Aufgabe = direkt aufs Konto gebucht (Firmenmeeting & Co.).
- `notiz` optional – Freitext zu diesem einen Block, im Block-Popover.
- **Anzeige** auf der Timeline: Aufgaben-Titel (bzw. Key + Titel), sonst Konto-Name; Farbe kommt vom Konto.

**Planen vs. Buchen**
- Geplante Blöcke sind die Tages-/Wochenplanung (auch für zukünftige Tage). Sie zählen **nicht** zur Ist-Zeit und werden halbtransparent/schraffiert dargestellt.
- Gebuchte Blöcke sind die tatsächliche Arbeitszeit.
- Ein geplanter Block wird per Klick/Häkchen zu „gebucht“; im **Tagesabschluss** gibt es „Plan übernehmen“ für alle geplanten Blöcke des Tages.
- Blöcke dürfen sich nicht überlappen (Validierung im Client und Server).

**Pausen** sind eigene Blöcke (`kind = pause`), werden angezeigt, aber nie zur Ist-Zeit gezählt. Keine Regelprüfung.

**Wiederkehrende Blöcke (Vorlagen)**
Feste Termine (Daily 09:30–09:45, Jour fixe dienstags …) werden einmal als **Vorlage** angelegt und automatisch als *geplante* Blöcke eingetragen; abends reicht „übernehmen“.
- Vorlage: Ziel (Aufgabe oder Konto), Start/Ende, Wochentage (z. B. Mo–Fr oder nur Di), optional Rhythmus „jede 2. Woche“, gültig ab/bis, aktiv.
- **Materialisierung**: Beim Laden eines Tages bzw. einer Woche erzeugt der Server fehlende geplante Blöcke für alle aktiven Vorlagen (bis max. 14 Tage in die Zukunft). Jeder erzeugte Block trägt `vorlageId`; eindeutiger Index `(vorlageId, datum)` verhindert Duplikate – auch ein gelöschter Einzeltermin wird als „ausgelassen“ gemerkt und nicht neu erzeugt.
- Nicht erzeugt an Tagen ohne Soll (Wochenende, Feiertag BW, Urlaub, Krank, Gleittag) und nicht, wenn der Zeitraum schon belegt ist (Hinweis-Badge am Tag).
- Vorlage ändern wirkt nur auf zukünftige, noch *geplante* Blöcke; gebuchte bleiben unangetastet.
- Anlegen: im Block-Menü „Als wiederkehrend speichern …“ oder unter Einstellungen → Wiederkehrende Blöcke.

### 3.3 Tage & Soll
Standard: Mo–Fr Arbeitstag mit **480 min** Soll, Sa/So 0.

| Tagestyp | Soll | Hinweis |
|---|---|---|
| Arbeit | 480 | Standard |
| Feiertag (BW) | 0 | automatisch aus `feiertagejs` |
| Urlaub | 0 | zieht 1 Urlaubstag ab |
| ½ Urlaub | 240 | zieht 0,5 Urlaubstage ab |
| Krank | 0 | |
| Gleittag | 480 | Ist bleibt 0 → −8h auf dem Konto |

Pro Tag optionaler **Soll-Override** (z. B. Heiligabend halber Tag).

### 3.4 Stundenkonto
```
Tagesdelta  = Ist (Summe gebuchter Arbeitsblöcke) − Soll
Kontostand  = Startsaldo (Einstellungen, ab Startdatum) + Σ Tagesdelta (Startdatum … gestern)
```
- „Heute“ wird separat live angezeigt (noch offen), fließt erst ab morgen in den Kontostand ein – im Widget: „Konto bis gestern: +3:15 · heute: 5:30 / 8:00“.
- Zukünftige Tage zählen nie.
- Monatsansicht: Monatsdelta + Kontostand am Monatsende. Ausgleich (Plus/Minus über den Monat) passiert implizit durch die laufende Summe; kein Kappen/Verfall **[Annahme]**.

### 3.5 Urlaub
- Der Anspruch ist **pro Jahr variabel** und setzt sich aus Posten zusammen (Tabelle `urlaubsanspruch`):
  - Grundanspruch des Jahres (z. B. 32)
  - beliebig viele **Zusatzposten** mit Bezeichnung und Tagen, z. B. „Sonderurlaub WS 26/27 +2“, „Sonderurlaub SS 27 +2“
  - Resturlaub aus Vorjahr als eigener Posten (manuell oder per Button „Rest aus Vorjahr übernehmen“)
- Aktuell: 36 Tage (inkl. 2 × 2 Semester-Zusatztage). Beim ersten Start mit Grundanspruch 32 + zwei Zusatzposten à 2 vorbelegen.
- Nice-to-have (Phase 4, darf wegfallen): Vorlage „wiederkehrender Zusatzposten“ (z. B. +2 pro Semester), die beim Anlegen eines neuen Jahres automatisch Posten erzeugt.
- Anzeige pro Jahr: Anspruch (Summe der Posten, aufklappbar) · genommen (vergangene Urlaubstage) · geplant (zukünftige) · Rest.
- Urlaub an Wochenenden/Feiertagen zählt nicht.

### 3.6 Merker & Daily-Themen
Ein Eintragstyp **Todo** mit `art`:
- `merker` – Dinge, die man nebenbei im Kopf haben sollte. Optional Fälligkeit, optional Bezug zu Aufgabe oder Konto.
- `daily` – Thema fürs nächste Daily. Aktion „besprochen“ → wandert ins Archiv (mit Datum).

- `warten` – **Warten auf**: Dinge, bei denen man auf jemand anderen wartet („PR-Review von Tim“). Felder: Text, *wer* (Freitext), optional *nachfassen am*. Anzeige mit Alter („seit 5 Tagen“); ab dem Nachfass-Datum hervorgehoben und oben in der Liste. Aktion „erledigt“ oder „nachgefasst“ (setzt neues Nachfass-Datum, Default +3 Arbeitstage).

Kein Status-Workflow außer offen/erledigt. Sortierung per Drag & Drop.

### 3.7 Notizen
- Titel, Markdown-Body, Tags, optional Bezug zu Aufgabe oder Konto, angepinnt ja/nein, erstellt/geändert. Auf der Aufgaben-Detailseite erscheinen die verknüpften Notizen.
- Suche über Titel + Inhalt (SQLite `LIKE` reicht für v1; FTS5 später optional).
- Markdown bleibt Obsidian-kompatibel (reines Markdown, keine proprietären Erweiterungen). Daybreak ersetzt Obsidian für Arbeitsnotizen; kein Sync in v1 **[Annahme]**.

### 3.8 Schnelleingabe
Eine Zeile, erreichbar im Heute-Screen und global über **`Strg+K`** (shadcn `Command`).

| Eingabe | Ergebnis |
|---|---|
| `2h PROJ-123 Review` | gebuchter Block, 2h auf Aufgabe PROJ-123, Notiz „Review“, im nächsten freien Slot |
| `2h login` | Fuzzy-Treffer auf Aufgaben-Titel („Login-Refactoring“) |
| `2h Neue Idee @apollo` | kein Aufgaben-Treffer → schlägt vor: Aufgabe „Neue Idee“ in Konto „Projekt Apollo“ anlegen und buchen |
| `9:00-10:30 mtg` | gebuchter Block mit fester Uhrzeit direkt auf Konto „Firmenmeeting“ (Alias) |
| `p 30m` | Pause 30 min im nächsten freien Slot |
| `plan 5h PROJ-123 morgen` | geplanter Block für morgen (auch `mo`, `di`, … oder `2026-10-01`) |
| `t Zertifikat verlängern` | Merker |
| `d Deployment-Freeze ansprechen` | Daily-Thema |
| `w Tim: PR-Review Login` | Warten auf – *wer* = Tim (Text vor dem ersten `:`), optional `bis fr` / `bis 2026-10-02` als Nachfass-Datum |
| `n Architektur-Idee` | neue Notiz mit Titel, öffnet Editor |
| ohne Präfix / kein Treffer | Suche über Aufgaben, Konten, Notizen, Todos |

Dauer-Formate: `2h`, `1.5h`, `1,5h`, `1h30`, `45m`, `90m`. Ziel-Erkennung in dieser Reihenfolge: Aufgaben-Key (exakt, case-insensitive) → Konto-Alias → Fuzzy auf offene Aufgaben-Titel → Fuzzy auf Konto-Namen; `@konto` grenzt auf ein Konto ein bzw. bestimmt das Konto einer neu anzulegenden Aufgabe; mehrdeutig → Auswahl-Popover. Text, der nach dem erkannten Ziel übrig bleibt, wird zur Block-Notiz. Ergebnis-Vorschau live unter der Eingabe, Enter bestätigt.
„Nächster freier Slot“: nach dem letzten Block des Tages, sonst ab Arbeitsbeginn (Einstellung, Default 08:00).

Parser als reine Funktion in `shared/utils/quickInput.ts`, vollständig mit Vitest getestet.


---

## 4. Datenmodell (Drizzle, SQLite)

Datum als `TEXT 'YYYY-MM-DD'`, Uhrzeiten als `INTEGER` Minuten seit Mitternacht, Timestamps als ISO-Strings.

```ts
konto:     id, name, farbe, aliase(json string[]), status('aktiv'|'archiviert'), erstelltAm
aufgabe:   id, kontoId(FK), key?(unique), titel, status('offen'|'abgeschlossen'), schaetzungMin?, erstelltAm, abgeschlossenAm?
block:     id, datum, start, ende, kind('arbeit'|'pause'), status('geplant'|'gebucht'),
           aufgabeId?(FK), kontoId?(FK), notiz?, vorlageId?(FK), erstelltAm
           // unique(vorlageId, datum) wo vorlageId gesetzt
vorlage:   id, aufgabeId?, kontoId?, start, ende, wochentage(json number[]), intervallWochen(default 1),
           gueltigAb, gueltigBis?, aktiv
vorlage_ausnahme: vorlageId, datum   // gelöschte Einzeltermine, werden nicht neu erzeugt
tag:       datum(PK), typ('arbeit'|'urlaub'|'halb_urlaub'|'krank'|'gleittag'), sollOverride?, notiz?
           // nur Abweichungen speichern; Feiertage werden berechnet, nicht gespeichert
todo:      id, art('merker'|'daily'|'warten'), text, wer?, nachfassenAm?, aufgabeId?, kontoId?, faelligAm?,
           sortierung, erledigtAm?, erstelltAm
notiz:     id, titel, inhalt, tags(json string[]), aufgabeId?, kontoId?, angepinnt, erstelltAm, geaendertAm
urlaubsanspruch: id, jahr, art('grund'|'zusatz'|'rest'), bezeichnung, tage(real, 0.5-Schritte)
settings:  key(PK), value(json)
           // sollProTagMin=480, arbeitstage=[1..5], bundesland='BW', arbeitsbeginn=480,
           // stundenkontoStart={datum, saldoMin}, urlaubVorlagen=[{bezeichnung, tage, proJahr}] (optional)
```

Indizes: `block(datum)`, `block(aufgabeId)`, `block(kontoId)`, `aufgabe(kontoId, status)`, `todo(art, erledigtAm)`, `notiz(geaendertAm)`.
Löschen: Konto/Aufgabe mit Blöcken nicht löschbar, nur archivieren/abschließen.

---

## 5. Screens

Layout: shadcn **Sidebar** links (einklappbar), Inhalt rechts, deutsches UI, Desktop-first (≥1280px), aber bis Tablet-Breite nutzbar.

1. **Heute** (`/`) – Startseite
   - Kopf: Datum, Tagestyp, Saldo-Widget (§3.4).
   - **Timeline**: horizontaler Balken 07:00–19:00 (sichtbarer Bereich einstellbar), Blöcke in Kontofarbe; geplante schraffiert; Pausen grau. Interaktionen: Ziehen auf leerer Fläche = neuer Block, Block verschieben, Ränder ziehen = Dauer, Rechtsklick/Menü = teilen, planen↔buchen, löschen, Aufgabe/Konto ändern. Snapping 15 min.
   - Fortschrittsbalken gebucht / Soll, daneben „geplant“.
   - Schnelleingabe-Zeile direkt unter der Timeline.
   - Buttons: „Wie gestern“ (kopiert gestrige gebuchte Blöcke als *geplant*), „Tagesabschluss“.
   - Rechte Spalte: **Aufgaben in Arbeit** (offene Aufgaben mit Buchungen der letzten 14 Tage oder Planung heute; mit Gesamtstunden; per Drag auf die Timeline → neuer Block), offene Merker, Warten auf (nur fällige/überfällige), Daily-Themen (mit „besprochen“), angepinnte Notizen.
2. **Tagesabschluss** (Sheet/Dialog aus „Heute“)
   - Lücke zum Soll, Liste geplanter Blöcke mit „übernehmen“, Vorschläge: zuletzt bebuchte Aufgaben und Konten als 1-Klick-Chips mit Dauer-Eingabe.
3. **Woche** (`/woche`)
   - 5 (bzw. 7) Timelines untereinander, Planung für kommende Tage per Drag & Drop (Aufgabe aus der Seitenliste auf einen Tag ziehen), Tagessummen, Wochensumme vs. Soll.
4. **Übersicht** (`/uebersicht`)
   - Zeitraum wählen (Woche / Monat / frei), **gruppiert Konto → Aufgabe → Tage**: Summe Stunden und Anteil je Ebene; direkt aufs Konto gebuchte Zeit als eigene Zeile „ohne Aufgabe“; Block-Notizen in der Tagesebene. Keine Exporte.
   - Stundenkonto-Verlauf als Linie pro Monat (shadcn Chart).
5. **Kalender** (`/kalender`)
   - Jahresansicht (12 Mini-Monate), Feiertage BW markiert, Abwesenheiten farbig; Klick/Range-Auswahl → Tagestyp setzen.
   - Urlaubskonto-Karte (§3.5).
6. **Merker & Daily** (`/todos`) – drei Listen (Merker · Warten auf · Daily-Themen), Archiv „besprochen/erledigt“ einklappbar.
7. **Notizen** (`/notizen`) – Liste mit Suche/Tag-Filter links, Editor (Textarea + Live-Vorschau) rechts, Autosave.
8. **Konten & Aufgaben** (`/konten`) – Konten links (Farbe, Aliase, archivieren), Aufgaben des gewählten Kontos rechts (Key, Titel, Status, Schätzung, gebucht gesamt). Klick auf eine Aufgabe → Detail (`/aufgaben/[id]`): alle Blöcke nach Tag, Summe vs. Schätzung, verknüpfte Merker und Notizen, Aufgabe in anderes Konto verschieben.
9. **Einstellungen** (`/einstellungen`) – alle `settings`-Werte, Urlaubsanspruch pro Jahr (Posten hinzufügen/bearbeiten), Wiederkehrende Blöcke (Vorlagen verwalten).

---

## 6. Design: dunkles Pastell-Theme

Dark-only in v1 (`class="dark"` fest auf `<html>`), ruhige, leicht violett-getönte Graus, gedämpfte Pastell-Akzente. Theme-Tokens in `app/assets/css/main.css` als shadcn-CSS-Variablen (OKLCH):

```css
.dark {
  --background:        oklch(0.18 0.015 280);
  --foreground:        oklch(0.93 0.010 280);
  --card:              oklch(0.215 0.018 280);
  --card-foreground:   oklch(0.93 0.010 280);
  --popover:           oklch(0.23 0.020 280);
  --popover-foreground:oklch(0.93 0.010 280);
  --primary:           oklch(0.80 0.090 290);  /* Lavendel */
  --primary-foreground:oklch(0.20 0.030 290);
  --secondary:         oklch(0.27 0.020 280);
  --secondary-foreground: oklch(0.90 0.010 280);
  --muted:             oklch(0.26 0.018 280);
  --muted-foreground:  oklch(0.70 0.020 280);
  --accent:            oklch(0.29 0.025 285);
  --accent-foreground: oklch(0.93 0.010 280);
  --destructive:       oklch(0.72 0.120 20);   /* gedämpftes Rosé-Rot */
  --border:            oklch(0.31 0.020 280);
  --input:             oklch(0.31 0.020 280);
  --ring:              oklch(0.80 0.090 290);
  --radius: 0.75rem;

  /* Kontofarben (Pastell) */
  --konto-lavendel: oklch(0.80 0.09 295);
  --konto-pfirsich: oklch(0.83 0.08 55);
  --konto-mint:     oklch(0.84 0.08 165);
  --konto-himmel:   oklch(0.82 0.08 235);
  --konto-rose:     oklch(0.80 0.09 5);
  --konto-butter:   oklch(0.88 0.08 95);
  --konto-salbei:   oklch(0.82 0.06 140);
  --konto-flieder:  oklch(0.78 0.08 320);

  /* Status */
  --positiv: oklch(0.84 0.08 165);  /* Plus-Stunden */
  --negativ: oklch(0.80 0.09 5);    /* Minus-Stunden */
}
```
Regeln: Pastellfarben nur als Flächen/Akzente mit dunklem Text darauf (`oklch(0.22 0.03 <hue>)`), nie als Fließtextfarbe auf dunklem Grund unter 14px. Plus/Minus nie nur über Farbe – immer mit Vorzeichen. Schrift: Inter (oder System-UI), Zahlen mit `tabular-nums`.

---

## 7. Projektstruktur

```
Daybreak/
├─ app/
│  ├─ assets/css/main.css
│  ├─ components/
│  │  ├─ ui/                 # shadcn-vue (generiert)
│  │  ├─ timeline/           # DayTimeline.vue, TimelineBlock.vue
│  │  ├─ quick-input/        # QuickInput.vue, CommandPalette.vue
│  │  └─ widgets/            # SaldoWidget.vue, UrlaubCard.vue …
│  ├─ composables/           # useDay, useBlocks, useSaldo, useTodos …
│  ├─ layouts/default.vue
│  └─ pages/                 # index, woche, uebersicht, kalender, todos, notizen, konten, aufgaben/[id], einstellungen
├─ server/
│  ├─ api/                   # REST-Routen je Entität
│  ├─ db/schema.ts
│  ├─ db/client.ts
│  └─ utils/
├─ shared/utils/             # quickInput.ts, soll.ts, saldo.ts, urlaub.ts (rein, testbar)
├─ tests/
├─ drizzle/                  # Migrationen
├─ data/                     # daybreak.db (gitignored)
├─ .github/workflows/        # ci.yml, docker.yml
├─ Dockerfile
├─ .dockerignore
├─ docker-compose.yml        # Beispiel für den Betrieb
├─ CLAUDE.md
└─ IMPLEMENTATION_PLAN.md
```

API (Nitro, JSON): `GET/POST/PATCH/DELETE /api/konten|aufgaben|blocks|tage|todos|notizen`, `GET /api/blocks?von&bis`, `GET /api/aufgaben?kontoId&status` (inkl. Summen gebucht/geplant), `GET /api/saldo?bis`, `GET /api/uebersicht?von&bis`, `GET/PUT /api/settings`. Validierung mit zod.

---

## 8. Phasen & Abnahmekriterien

### Phase 0 – Setup
- Nuxt 4 **im bestehenden Ordner** scaffolden (Plan-Dateien und `.mcp.json` behalten), Tailwind v4, `shadcn-vue init`, Skill installieren, Drizzle + libsql, Vitest.
- Theme aus §6, Sidebar-Layout mit allen Routen als Platzhalter.
- Dockerfile, `docker-compose.yml`, GitHub-Workflows (§9) und `/api/health` direkt mit aufsetzen, damit jede Phase deploybar ist.
- ✅ `pnpm dev` startet, dunkles Theme sichtbar, `/mcp` zeigt `nuxt` und `shadcn` verbunden, `pnpm test` läuft.
- ✅ `docker compose up --build` startet die App, Migrationen laufen automatisch, Daten überleben einen Container-Neustart; CI ist auf einem Push grün.

### Phase 1 – Zeit (Kern)
- Konten- und Aufgaben-CRUD (inkl. Aufgaben-Detailseite), Settings, Block-CRUD, Timeline (anlegen/verschieben/resize/teilen, planen↔buchen, Pausen), Schnelleingabe für Zeit + Pause + plan, Saldo-Logik inkl. Feiertage BW, Saldo-Widget, „Wie gestern“, Tagesabschluss, wiederkehrende Blöcke (Vorlagen + Materialisierung).
- ✅ Eine Vorlage „Daily Mo–Fr 09:30–09:45“ erzeugt genau einen geplanten Block pro Arbeitstag, keinen an Feiertagen/Urlaub, und einen gelöschten Einzeltermin nicht erneut.
- ✅ Ein Tag lässt sich allein per Schnelleingabe in < 1 min vollständig buchen; Saldo stimmt mit Unit-Tests (Feiertag, Gleittag, ½ Urlaub, Soll-Override, Wochenende) überein.

### Phase 2 – Merker, Warten auf, Daily, Command-Palette
- Todo-CRUD (alle drei Arten), Heute-Seitenspalte, `/todos`, `t`/`d`/`w`-Präfixe, globale `Strg+K`-Palette mit Suche.
- ✅ Ein Merker ist von jeder Seite aus in 2 Tastendrücken + Text erfasst.

### Phase 3 – Notizen
- CRUD, Editor mit Vorschau, Tags, Suche, anpinnen, Konto-Verknüpfung, `n`-Präfix.

### Phase 4 – Kalender & Urlaub
- Jahresansicht, Tagestypen per Range setzen, Urlaubskonto mit variablen Anspruchsposten pro Jahr, Woche-Seite mit Planung für kommende Tage.
- Optional: wiederkehrende Zusatzposten (Semester-Tage) als Vorlage.

### Phase 5 – Übersicht
- Gruppierte Übersicht Konto → Aufgabe → Tage, Stundenkonto-Verlauf.


---

## 9. Deployment

### Dockerfile
- **Multi-Stage** auf `node:22-slim` (glibc; vermeidet Probleme mit nativen libsql-Binaries unter Alpine):
  1. `deps`: `corepack enable`, `pnpm install --frozen-lockfile`
  2. `build`: `pnpm build` → `.output/`
  3. `runtime`: nur `.output/`, `drizzle/` (Migrationen) und das Migrationsskript kopieren; läuft als Nicht-Root-User `node`.
- `ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_URL=file:/data/daybreak.db`
- `VOLUME /data`, `EXPOSE 3000`
- `HEALTHCHECK` gegen `GET /api/health` (liefert `{ ok: true }` + DB-Ping).
- Start: erst Migrationen anwenden (kleines Skript `server/db/migrate.mjs` mit `drizzle-orm/libsql/migrator`), dann `node .output/server/index.mjs`. Keine `drizzle-kit`-Abhängigkeit zur Laufzeit.
- `.dockerignore`: `node_modules`, `.nuxt`, `.output`, `data`, `.git`, `*.md` außer nötigen.

### docker-compose.yml (Beispiel)
```yaml
services:
  daybreak:
    image: ghcr.io/<owner>/daybreak:latest
    build: .
    ports: ["3000:3000"]
    volumes: ["./data:/data"]
    environment:
      - TZ=Europe/Berlin
      # - DAYBREAK_PASSWORD=...   # optionaler Zugangsschutz (Basic Auth)
    restart: unless-stopped
```
`TZ=Europe/Berlin` ist wichtig, damit „heute“ und Tagesgrenzen stimmen.

### Zugangsschutz
Die App hat keine Benutzerverwaltung. Sobald sie nicht nur lokal läuft, muss sie geschützt sein:
- Wenn `DAYBREAK_PASSWORD` gesetzt ist, verlangt eine Nitro-Server-Middleware HTTP Basic Auth (User beliebig, Passwort aus der Variable, Vergleich timing-safe). `/api/health` ist ausgenommen.
- Ist `DAYBREAK_PASSWORD` nicht gesetzt, läuft die App ohne Schutz und loggt beim Start eine Warnung.
- Alternativ Schutz über den Reverse Proxy (z. B. Forward-Auth/SSO) und Variable leer lassen.

### Backup
Die gesamte Datenhaltung ist die Datei `/data/daybreak.db` im Volume; Backup = Datei sichern (SQLite `VACUUM INTO` für ein konsistentes Snapshot, optional als Button in den Einstellungen).

### GitHub Actions
- **`.github/workflows/ci.yml`** – bei Push und Pull Request:
  `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` (`nuxi typecheck`) → `pnpm test` → `pnpm build`. pnpm-Store cachen.
- **`.github/workflows/docker.yml`** – bei Push auf `main` und bei Tags `v*`:
  `docker/setup-buildx-action` → `docker/login-action` (GHCR, `GITHUB_TOKEN`, `permissions: packages: write`) → `docker/metadata-action` (Tags: `latest` für main, SemVer für Tags, `sha-<kurz>`) → `docker/build-push-action` mit GHA-Cache. Plattform `linux/amd64` (arm64 optional ergänzen, falls der Server ARM ist).
- Kein automatisches Ausrollen auf den Server; Update per `docker compose pull && docker compose up -d` (oder Watchtower).

---

## 10. Offen / später
- Hell-Theme.
- FTS5-Suche.
- Optionaler Markdown-Export von Notizen nach Obsidian.