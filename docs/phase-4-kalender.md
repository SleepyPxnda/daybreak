# Phase 4 – Kalender, Urlaub & Woche

Jahreskalender mit Abwesenheiten, Urlaubskonto mit variablen Anspruchsposten, Wochenplanung.

## Bedienung

### Kalender (`/kalender`)
- **Jahresansicht** mit 12 Mini-Monaten, Jahr über `‹ 2026 ›` wechseln (`?jahr=2027`).
- **Farben:** Urlaub, ½ Urlaub (heller), Krank, Gleittag; **Feiertage** (Bundesland aus den Einstellungen) umrandet; Wochenenden gedimmt; ein Punkt markiert ein abweichendes Soll; heute fett unterstrichen. Tooltip zeigt Wochentag, Feiertag, Typ, abweichendes Soll und Notiz.
- **Tagestyp setzen:** einen Tag anklicken oder über mehrere Tage ziehen (auch über Monatsgrenzen). Die Leiste oben zeigt den Bereich und die Zahl der Arbeitstage – dann **Urlaub**, **½ Urlaub**, **Krank**, **Gleittag** oder **Zurücksetzen** wählen. Bei einem einzelnen Tag gibt es „Tag öffnen“ (→ Heute). `Esc` hebt die Auswahl auf.
- Rechts die **Urlaubskarte**: Resttage groß, darunter Anspruch (aufklappbar mit allen Posten), genommen, geplant; „bearbeiten“ führt zu den Einstellungen.

### Blocker (Nachtrag)
- Markiert Tage, an denen man **keinen Urlaub nehmen sollte** (Release, Messe, Vertretung …): im Kalender **rot schraffiert**, Tooltip „Blocker – kein Urlaub“.
- Setzen wie Tagestypen: Bereich auswählen → **Blocker**. Sind alle Arbeitstage der Auswahl schon blockiert, heißt der Knopf **Blocker entfernen**. „Zurücksetzen“ entfernt auch den Blocker.
- Enthält eine Auswahl Blocker-Tage, warnt die Aktionsleiste („2 Blocker-Tage – hier besser kein Urlaub“). Urlaub lässt sich trotzdem setzen – der Tag ist dann grün **und** schraffiert, der Konflikt bleibt sichtbar.

### Urlaubsanspruch (Einstellungen)
- Pro Jahr beliebig viele **Posten**: Art (Grund, Zusatz, Rest), Bezeichnung, Tage (halbe Tage möglich, negative für Abzüge). Änderungen werden beim Verlassen eines Feldes gespeichert.
- **„Rest aus Vorjahr übernehmen“** legt den Rest des Vorjahres als Posten „Resturlaub <Jahr>“ an bzw. aktualisiert ihn (erscheint, wenn es im Vorjahr Posten gibt).
- **Vorbelegung beim ersten Start** (laufendes Jahr): Grundanspruch 32, „Sonderurlaub WS 26/27“ +2, „Sonderurlaub SS 27“ +2 – insgesamt 36 wie im Plan.

### Nächster Urlaub auf „Heute“ (Nachtrag)
- **Karte „Nächster Urlaub“** unter der Timeline: Zeitraum, „in 84 Tagen“, Anzahl Urlaubstage. Ohne geplanten Urlaub ein Link zum Kalender.
- **Erinnerung:** Ab *X Tagen* vor Beginn (Einstellungen → „Urlaubserinnerung (Tage vorher)“, Standard 7) erscheint stattdessen ein hervorgehobener Hinweis über der Timeline mit Countdown, verbleibenden Arbeitstagen und dem **Erinnerungstext** aus den Einstellungen (Standard „Übergabe planen, Abwesenheitsnotiz und Vertretung einrichten.“).
- Während des Urlaubs: „Im Urlaub bis …“.
- **Bestätigen (Nachtrag):** Ein geplanter Urlaub ist zunächst unbestätigt. Im Erinnerungs-Banner steht rechts der Button **„Bestätigt“** – nach der Übergabe klicken. Danach entfallen Button und Erinnerungstext, es bleibt nur der Urlaubsvermerk (Countdown, Zeitraum, Anzahl Urlaubstage, Arbeitstage davor).

### Woche (`/woche`)
- Kalenderwoche mit `‹ KW 40 ›` wechseln (`?woche=<Datum>`), „Diese Woche“ springt zurück.
- **Eine Timeline pro Tag** (kompakt: ohne Zoom-Leiste, Zoomen per `Strg`+Mausrad geht trotzdem). Alle Timeline-Aktionen wie auf „Heute“: ziehen zum Anlegen, verschieben, Ränder ziehen, Rechtsklick-Menü, Klick zum Bearbeiten.
- Pro Tag: Datum (Link auf „Heute“ für diesen Tag), Feiertag/Tagestyp, gebucht / Soll, geplant, Hinweis auf nicht eingetragene Vorlagen.
- Kopf: **Wochensumme** gebucht / Soll mit Differenz (±) und geplant.
- **Wochenende** per Schalter einblenden; hat Sa/So Blöcke oder Soll, wird es automatisch gezeigt.
- Rechts **Aufgaben in Arbeit** – auf einen Tag ziehen plant einen 1-h-Block (Zukunft geplant, Vergangenheit gebucht).

## Fachregeln & Entscheidungen

Reine Funktionen in `shared/utils/urlaub.ts` (Tests: `tests/urlaub.test.ts`).

- **Urlaubstage:** Urlaub = 1, ½ Urlaub = 0,5 – nur an regulären Arbeitstagen; Urlaub an Wochenenden/Feiertagen zählt nicht (Plan §3.5).
- **genommen** = Urlaubstage bis **einschließlich heute**, **geplant** = danach, **Rest** = Anspruch − genommen − geplant (kann negativ werden).
- **Vorbelegung** läuft genau einmal (Flag `urlaubVorbelegt` in `settings`) und nur, wenn noch gar keine Posten existieren – gelöschte Posten kommen nicht zurück. Bezeichnungen wortgleich zum Plan.
- **Nächster Urlaub** (`naechsterUrlaub`): Aufeinanderfolgende Urlaubstage (auch ½) bilden einen Zeitraum; Wochenenden/Feiertage dazwischen überbrücken ihn, ein Arbeitstag ohne Urlaub beendet ihn. Ist heute ein freier Tag mitten im Urlaub, gilt der Urlaub als laufend. Krank und Gleittag zählen nicht. „Arbeitstage davor“ zählt reguläre Arbeitstage zwischen heute und Beginn (beide exklusiv). Suchhorizont 1 Jahr. Ergänzung zum Plan (Wunsch nach Phase 4).
- **Rest übernehmen** ersetzt einen vorhandenen Rest-Posten des Jahres (auf halbe Tage gerundet).
- **Bereich setzen:** Abwesenheiten werden nur an regulären Arbeitstagen gespeichert (Wochenenden/Feiertage bleiben sauber). „Zurücksetzen“ löscht Einträge ohne Soll-Override/Notiz und setzt die übrigen auf Arbeitstag – Override und Notiz bleiben erhalten.
- **Blocker** (Ergänzung zum Plan) ist ein eigenes Flag `tag.blocker`, **kein Tagestyp**: Er ändert weder Soll noch Urlaubszählung und kann mit Urlaub/Krank/Gleittag kombiniert werden, damit Konflikte sichtbar bleiben statt den Blocker stillschweigend zu überschreiben. Nur an regulären Arbeitstagen gespeichert. Ein Tag mit Blocker gilt als Abweichung und wird nicht gelöscht – auch nicht, wenn man auf „Heute“ den Tagestyp auf Arbeit zurückstellt; entfernen nur im Kalender. Rot schraffiert über die Utility `blocker-schraffur` (Token `--destructive`).
- **Bestätigung** (Nachtrag) ist ein Flag `tag.bestaetigt` an den Urlaubstagen. Ein Urlaub gilt als bestätigt, wenn **alle** seine (½-)Urlaubstage bestätigt sind – kommt später ein Tag dazu, erscheint der Button wieder. Ändert sich der Tagestyp eines Tages (Kalender oder „Heute“), wird seine Bestätigung verworfen; gleicher Typ erneut gesetzt behält sie. Während des Urlaubs gibt es keinen Button.
- **Nicht umgesetzt (optional laut Plan):** Vorlage für wiederkehrende Zusatzposten (Semester-Tage) – Posten werden pro Jahr manuell gepflegt.
- **Umbau:** Die Timeline-Aktionen (anlegen, ändern, Menü, Drop von Aufgaben/Merkern, Dialog-Zustand) liegen jetzt im Composable `useBlockBearbeitung` und werden von Heute und Woche gemeinsam genutzt; die Jetzt-Minute in `useJetzt`.

## Datenmodell & API

Tabellen `urlaubsanspruch` (`jahr`, `art`, `bezeichnung`, `tage`) und `tag` – beide seit Phase 0 im Schema, keine Migration.

| Route | Zweck |
|---|---|
| `GET /api/urlaub?jahr` | Konto (`anspruch`, `genommen`, `geplant`, `rest`), `posten`, `vorjahrRest`; legt beim ersten Aufruf die Vorbelegung an |
| `POST /api/urlaub/posten`, `PATCH/DELETE /api/urlaub/posten/:id` | Posten pflegen (Tage in 0,5-Schritten) |
| `POST /api/urlaub/rest-uebernehmen` | `{ jahr }` → Rest-Posten aus dem Vorjahr |
| `GET /api/urlaub/naechster` | nächster/laufender Urlaub (inkl. `bestaetigt`), `erinnern` (innerhalb des Vorlaufs), `erinnerungText` |
| `POST /api/urlaub/bestaetigen` | `{ von, bis }` – alle Urlaubstage im Zeitraum als bestätigt markieren (Migration `0003_tag_bestaetigt`) |
| `PUT /api/tage/bereich` | `{ von, bis, typ }` – Tagestyp für einen Bereich (max. 1 Jahr) – oder `{ von, bis, blocker: true \| false }` |
| `GET /api/tage?von&bis` | liefert jetzt zusätzlich `sollOverride` und `blocker` |

Migration `0002_tag_blocker`: Spalte `tag.blocker` (boolean, Default `false`).

## Offen / bekannte Grenzen

- Nicht im Browser geprüft (Range-Auswahl per Ziehen, Wochenplanung).
- Soll-Override und Tagesnotiz setzt man weiterhin nur tageweise über „Heute“ (Tagestyp-Popover), nicht im Kalender.
- Die Bereichsauswahl im Kalender funktioniert mit Maus/Stift; auf Touch-Geräten nur per Tippen einzelner Tage.
