# Phase 1 – Zeit (Kern)

Konten & Aufgaben, Timeline, Schnelleingabe für Zeit, Stundenkonto, Tagesabschluss, wiederkehrende Blöcke.

## Bedienung

### Konten & Aufgaben (`/konten`)
- Links die Konten (Farbe, Aliase für die Schnelleingabe, Archivieren im Bearbeiten-Dialog; „Archivierte zeigen“ blendet sie ein).
- Rechts die Aufgaben des gewählten Kontos mit Key, Titel, Status, Schätzung, gebuchter Zeit. Klick → Detailseite.
- **Aufgaben-Detail** (`/aufgaben/:id`): Summe gebucht/geplant, Fortschritt gegen Schätzung, alle Blöcke nach Tag (Klick auf den Tag öffnet ihn auf „Heute“). Bearbeiten (auch Konto wechseln – Blöcke und Vorlagen ziehen mit), Abschließen/Wieder öffnen, Löschen nur ohne Blöcke.
- Konten mit Aufgaben, Blöcken oder Vorlagen lassen sich nicht löschen – nur archivieren.

### Heute (`/`)
- **Kopf:** `‹ Tag ›` zum Blättern (fester Textblock, damit die Pfeile nicht springen), „Heute“-Button zurück. Andere Tage per `?datum=YYYY-MM-DD`. Rechts **Tagestyp** (Arbeitstag, Urlaub, ½ Urlaub, Krank, Gleittag, optional abweichendes Soll und Notiz) und **Saldo-Widget** „Konto bis gestern: +3:15 · heute: 5:30 / 8:00“.
- **Timeline** (volle Breite):

  | Aktion | Wie |
  |---|---|
  | Block anlegen | auf leerer Fläche ziehen → Dialog (Aufgabe/Konto, Pause, geplant/gebucht, Notiz) |
  | verschieben / Dauer ändern | Block ziehen / Ränder ziehen |
  | bearbeiten | Klick auf den Block |
  | Menü | Rechtsklick: Buchen ↔ Geplant, Hier teilen, Aufgabe/Konto ändern, Als wiederkehrend speichern, Löschen |
  | zoomen | `Strg`/`⌘`+Mausrad oder Pinch, Buttons `−` `+` `↺` |
  | verschieben der Sicht | horizontal scrollen, `Shift`+Mausrad, mittlere Maustaste ziehen |
  | Aufgabe einplanen | aus „Aufgaben in Arbeit“ auf die Timeline ziehen → 1-h-Block |

  Alles rastet im 15-min-Raster ein. Überschneidungen werden beim Ziehen rot markiert und nicht gespeichert. Geplante Blöcke sind schraffiert, Pausen grau; die Jetzt-Linie zeigt die aktuelle Uhrzeit.
- Darunter Fortschritt „Gebucht x / Soll“ mit „geplant“, die **Schnelleingabe** und die Buttons **Wie gestern** und **Tagesabschluss**.
- **Karten unter der Timeline:** Aufgaben in Arbeit (sowie Merker, Warten auf, Daily-Themen aus Phase 2 und angepinnte Notizen aus Phase 3).

### Schnelleingabe (Zeit)

| Eingabe | Ergebnis |
|---|---|
| `2h PROJ-123 Review` | gebucht, 2 h auf Aufgabe PROJ-123, Notiz „Review“, nächster freier Slot |
| `2h login` | Fuzzy-Treffer auf offene Aufgabentitel |
| `2h Neue Idee @apollo` | kein Treffer im Konto → legt Aufgabe „Neue Idee“ in Apollo an und bucht |
| `1h @wartung` | direkt aufs Konto |
| `9:00-10:30 mtg` | feste Uhrzeit, Konto per Alias `mtg` |
| `p 30m` | Pause |
| `plan 5h PROJ-123 morgen` | geplant für morgen (`mo`…`so`, `heute`, `gestern`, `übermorgen`, `2026-10-01`) |

Dauern: `2h`, `1.5h`, `1,5h`, `1h30`, `45m`, `90m`, `30min`. Zeiträume: `9:00-10:30`, `9-10`. Live-Vorschau unter der Zeile, Enter bestätigt, Esc leert. Mehrere Treffer → Auswahl-Buttons.

### Tagesabschluss & „Wie gestern“
- **Tagesabschluss** (Sheet): Lücke zum Soll, geplante Blöcke einzeln oder alle „übernehmen“ (→ gebucht), Schnell-Buchen: Dauer eingeben (vorbelegt mit der Lücke) und Chip einer zuletzt bebuchten Aufgabe/eines Kontos klicken.
- **Wie gestern**: kopiert die gebuchten Blöcke des letzten Tages mit Buchungen (max. 7 Tage zurück) als *geplant*; belegte Zeiträume werden übersprungen.

### Einstellungen (`/einstellungen`)
- Soll pro Tag, Arbeitstage, Bundesland (Feiertage), Arbeitsbeginn (für „nächster freier Slot“), sichtbarer Timeline-Bereich, Stundenkonto-Startdatum und Startsaldo.
- **Wiederkehrende Blöcke:** Name (optional, z. B. „Daily“ – steht dann auf der Timeline), Ziel, Zeit, Wochentage, Rhythmus (jede 1.–4. Woche), gültig ab/bis. Archivieren statt Aktiv-Schalter; archivierte stehen eingeklappt unter „Archiviert“ (Wiederherstellen/Endgültig löschen).
- Alternativ im Block-Menü „Als wiederkehrend speichern …“ (verknüpft den Ausgangsblock mit der neuen Vorlage).

## Fachregeln & Entscheidungen

Reine Funktionen in `shared/utils/` mit Tests in `tests/`.

### Soll (`soll.ts`)
| Tag | Soll |
|---|---|
| Arbeitstag | `sollProTagMin` (480) |
| Wochenende / Feiertag (feiertagejs, Bundesland aus Einstellungen) | 0 |
| Urlaub, Krank | 0 |
| ½ Urlaub | halbes Tagessoll |
| Gleittag | volles Soll (Ist 0 → Minus) |

- **Soll-Override gewinnt immer**, auch am Wochenende/Feiertag.
- Abwesenheiten an Wochenenden/Feiertagen wirken nicht.

### Stundenkonto (`saldo.ts`)
`Kontostand = Startsaldo + Σ (Ist − Soll)` vom Startdatum bis **gestern**. Heute wird separat live angezeigt, Zukunft zählt nie. Ist = gebuchte Arbeitsblöcke (geplante und Pausen zählen nicht). Das Startdatum wird beim ersten Laden der Einstellungen auf den Tag gesetzt.

### Blöcke (`bloecke.ts`)
- 15-min-Raster, Start < Ende, innerhalb 0–24 Uhr, **keine Überlappung** (Client und Server).
- Arbeit braucht ein Konto; mit Aufgabe kommt das Konto von der Aufgabe (Server erzwingt).
- **Nächster freier Slot:** nach dem letzten Block des Tages (auch geplante), sonst Arbeitsbeginn.
- Neue Blöcke per Ziehen/Drop: gebucht, wenn der Zeitraum in der Vergangenheit liegt, sonst geplant.

### Vorlagen (`vorlagen.ts`)
- Materialisierung beim Laden eines Zeitraums (`GET /api/blocks`), höchstens bis heute + 14 Tage.
- Gilt, wenn aktiv, im Gültigkeitszeitraum, passender Wochentag, Rhythmus: Wochen seit der Woche von „gültig ab“ `% n == 0`.
- Nur an regulären Arbeitstagen mit Typ Arbeit oder **½ Urlaub** (Entscheidung: an ½-Urlaubstagen wird das Daily trotzdem eingetragen); nicht an Urlaub, Krank, Gleittag.
- Nie doppelt: eindeutiger Index `(vorlageId, datum)`; gelöschte Einzeltermine → `vorlage_ausnahme`. Wird ein Vorlagen-Termin auf einen anderen Tag verschoben, wird er ein normaler Block und der alte Tag gilt als ausgelassen.
- Belegter Zeitraum → kein Block, sondern Hinweis-Badge „… nicht eingetragen – Zeitraum belegt“.
- Vorlage ändern/archivieren löscht künftige (> heute) noch geplante Termine; sie werden neu erzeugt. Gebuchte und vergangene bleiben.

### Schnelleingabe-Parser (`quickInput.ts`)
- **Reihenfolge:** Präfix (`p`, `plan`) → Dauer/Uhrzeit direkt danach → Datum als **letztes** Wort.
- **Ziel-Erkennung:** Aufgaben-Key exakt (auch abgeschlossene) → Konto-Alias → Fuzzy auf offene Aufgabentitel (längster passender Wortanfang, Rest = Notiz) → Fuzzy auf aktive Konto-Namen.
- **Mit `@konto`:** muss der **ganze** Rest auf eine Aufgabe des Kontos passen, sonst neue Aufgabe (verhindert, dass „Neue Idee“ auf irgendeine Aufgabe mit „neue“ bucht). `2h @apollo` bucht aufs Konto.
- **Wochentage:** bei `plan` nach vorn (nächstes Vorkommen nach heute), beim Buchen zurück (letztes bis heute). Gebucht in der Zukunft ist ein Fehler.
- Ohne Datumsangabe gilt der angezeigte Tag (`standardDatum`), relative Angaben bleiben relativ zu heute.

### Aufgaben in Arbeit
Offene Aufgaben mit Buchung in den letzten 14 Tagen **oder** Planung am Tag **oder in den letzten 14 Tagen angelegt** (Erweiterung zum Plan, damit neue Aufgaben direkt auf die Timeline gezogen werden können).

### Weitere technische Entscheidungen
- Block bearbeiten im **Dialog** statt Popover.
- Mutationen über `app/utils/api.ts` (untypisiertes `$fetch`): Nitros Routen-Typinferenz läuft bei dynamischen URLs in „Excessive stack depth“.
- Timeline-Zoom-Rechnung als reine Funktionen in `app/utils/timeline.ts` (getestet); Zoom-Stand wird nicht gespeichert.

### Fix: lange Aufgabentitel (nach Phase 5)
Lange Titel (auch ohne Leerzeichen) haben Dialoge und Tabellen verbreitert. Regel jetzt: **Listen, Chips und Auswahlfelder schneiden ab** (`truncate`, voller Titel als Tooltip), **Überschriften und Fließtext brechen um** (`wrap-anywhere`).
- `ZielAuswahl` (Block-, Vorlagen-, Merker-, Notiz-Dialog): Wert im Trigger mit `truncate` + `contain-inline-size`, damit er den Dialog nicht aufzieht; Dropdown max. 36rem breit, Einträge abgeschnitten.
- Konten-Tabelle: Titel-Spalte bricht um (statt `whitespace-nowrap` der shadcn-Zelle); Kontoname im Kopf abgeschnitten.
- Aufgaben-Detailseite: Überschrift bricht um, Buttons bleiben daneben.
- Befehlspalette, Schnelleingabe-Treffer, Tagesabschluss-Chips und geplante Blöcke, Merker-Bezug, „Aufgaben in Arbeit“: abgeschnitten mit Tooltip.
- **Ursache für „Text verschwindet hart hinter dem Kartenrand“:** `grid` ohne explizite Spalten hat eine `auto`-Spalte, die nicht umbrechenden Text in voller Breite aufnimmt – die Karte schneidet dann ab, Ellipse und rechte Spalte (Stunden) fehlen. Regel: Grids mit einzeiligen Texten bekommen **`grid-cols-1`** (= `minmax(0, 1fr)`), gesetzt auf Seiten-Spalten, Karten-Inhalten, Todo-Liste, Tagesabschluss, Übersicht.
- **Weiches Auslaufen:** Utility `auslaufen` (`main.css`) blendet zu lange Titel rechts per Maske aus statt „…“ – nur auf Elementen, die die Zeile füllen (Aufgaben in Arbeit, angepinnte Notizen, geplante Blöcke im Tagesabschluss, Notizen der Aufgabe). Schmale Elemente (Chips, Palette) behalten die Ellipse, sonst würde auch kurzer Text am Ende verblassen.
- „Aufgaben in Arbeit“: Der Ziehgriff liegt im Karten-Innenabstand und belegt links keinen Platz mehr.

## Datenmodell & API

Tabellen (Plan §4): `konto`, `aufgabe`, `block` (+ `vorlageId`), `vorlage` (+ `name`, Migration `0001`), `vorlage_ausnahme`, `tag`, `settings`.

| Route | Zweck |
|---|---|
| `GET/PUT /api/settings` | Einstellungen (mit Defaults) |
| `GET/POST /api/konten`, `PATCH/DELETE /api/konten/:id` | Konten; Aliase müssen eindeutig sein |
| `GET /api/aufgaben?kontoId&status&inArbeit=<datum>` | Aufgaben inkl. `gebuchtMin`/`geplantMin` |
| `GET/PATCH/DELETE /api/aufgaben/:id`, `POST /api/aufgaben` | Detail mit Blöcken; Key eindeutig (409) |
| `GET /api/blocks?von&bis` | Blöcke mit Anzeige-Infos; materialisiert Vorlagen, liefert `konflikte` |
| `POST /api/blocks` | mit `start`+`ende` **oder** `dauer` (→ nächster freier Slot) |
| `PATCH/DELETE /api/blocks/:id`, `POST /api/blocks/:id/teilen` | Überlappung → 409 |
| `POST /api/blocks/uebernehmen` | geplante eines Tages (oder `ids`) → gebucht |
| `POST /api/blocks/wie-gestern`, `GET /api/blocks/zuletzt?datum` | Wie gestern, Tagesabschluss-Vorschläge |
| `GET /api/tage?von&bis`, `PUT /api/tage/:datum` | Tagesinfos; nur Abweichungen werden gespeichert |
| `GET/POST /api/vorlagen`, `PATCH/DELETE /api/vorlagen/:id` | Vorlagen |
| `GET /api/saldo?heute` | Kontostand bis gestern + Ist/Soll/geplant heute |

Tests: `zeit`, `soll`, `saldo`, `bloecke`, `vorlagen` (Abnahme „Daily Mo–Fr“), `quickInput`, `timelineSicht`.

## Offen / bekannte Grenzen

- Abnahme „Tag in < 1 min per Schnelleingabe buchen“ ist gebaut, aber nicht im Browser gemessen.
- API wurde nicht live mit curl getestet, nur über Typecheck und Unit-Tests der Fachlogik.
- Der Überlappungs-Check auf dem Server läuft außerhalb einer Transaktion (Single-User, daher unkritisch).
- Vorlagen materialisieren auch für vergangene Tage im geladenen Zeitraum (ab „gültig ab“).
