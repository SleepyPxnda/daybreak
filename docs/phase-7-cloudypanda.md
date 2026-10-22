# Phase 7 – Redesign nach dem cloudypanda-Markensystem

daybreak ist Teil der Tool-Familie **cloudypanda**. Diese Phase stellt die gesamte Oberfläche auf deren Markensystem um. Grundlage sind das Design-System-Artifact „cloudypanda“ und der Entwurf „daybreak · Redesign“, in dem alle Seiten als Mockup angelegt sind. Funktionen, API und Datenmodell bleiben unverändert.

## Bedienung

An der Bedienung ändert sich fast nichts:
- **Kopfzeile auf jeder Seite.** Sie enthält die Schnelleingabe (`Strg K`) und das Stundenkonto als Pille („Konto ±h:mm · heute ist / soll“). Bisher stand das Stundenkonto nur auf „Heute“, die Schnelleingabe in der Sidebar.
- **Sidebar in zwei Gruppen.** „Zeit“ enthält Heute, Woche, Übersicht und Kalender. „Arbeit“ enthält Merker & Daily, Notizen sowie Konten & Aufgaben. Einstellungen sitzen unten. Die Aufgaben-Detailseite markiert „Konten & Aufgaben“ als aktiv.
- **Heute.** Die Zeitleiste ist eine Karte mit Kopf. Zoom-Steuerung und Fortschritt („Gebucht“, Balken, „geplant“) sitzen darin. „Wie gestern“ und „Tagesabschluss“ stehen in einer Zeile mit der Schnelleingabe.

## Fachregeln & Entscheidungen

- **Tokens.** Die Tokens kommen aus dem Markensystem, die vollständige Tabelle steht in Plan §6. Die Ebenen sind:
  - `surface` `#0f1115`: Seite.
  - `surface-raised` `#181b21`: Sidebar, Kartenköpfe, Felder.
  - `surface-overlay` `#20242c`: Menüs, Dialoge.

  Haarlinien in `line`, Ränder von Bedienelementen in `line-strong`. Keine Schatten.
- **Akzent.** Einziger Akzent ist `accent-daybreak` (Bernstein `#e8a042`). Er steht auf dem Icon, dem Tool-Namen, dem einen Primärbutton, aktiven Zuständen und Links. Aktive Zustände sind `bg-primary/12 text-primary`.
- **Statusfarben der Marke** (`--positiv`, `--negativ`, `--warnung`, `--info`, jeweils mit `*-subtle`-Fläche) ersetzen die bisherige Nutzung von Pastelltönen als Status:
  - Fällige Merker und „nachfassen“ sind jetzt Warnung statt „butter“.
  - Der Urlaubs-Hinweis ist jetzt Info statt „mint“.

  Status wird immer mit Symbol und Wort gezeigt.
- **Kontofarben.** Die acht Pastelltöne bleiben, weil ihre Schlüssel in der DB stehen. Sie erscheinen nur noch als Punkt, Balken oder getönte Fläche (`kontoFarbKlassen().flaeche`: Fläche 18 %, Rand 55 %, Text `ink`). Die dunklen `-fg`-Textfarben sind entfallen.
- **Kalender-Kategorien.**
  - Urlaub, Krank und Gleittag: getönte Fläche mit Rand in mint, pfirsich bzw. himmel. ½ Urlaub: halbe Diagonale. Unbestätigt: nur gestrichelter Rand.
  - Feiertag: neutraler Ring statt rose.
  - Heute: Akzentfläche. Auswahl: Akzent-Tönung.
- **Schrift.** Geist für die Oberfläche, Geist Mono für Zahlen, Zeiten, IDs und den Schriftzug „daybreak“. Beide sind self-hosted über `@fontsource-variable/geist` und `@fontsource-variable/geist-mono`; Montserrat ist entfernt. `.tabular-nums` setzt global Mono.
- **Buttons.** Sie folgen dem Standard-Stil von shadcn-vue (Rundung 8 px, `outline` für sekundäre Aktionen, 3-px-Fokus-Ring). Die Marke schreibt eigentlich randlose Buttons vor; die Abweichung ist bewusst so gewünscht. `shadow-xs` ist weggelassen.
- **Weitere Komponenten.**
  - Felder: `h-9`, `rounded-md`, Rand `line-strong` auf `surface-raised`.
  - Karten: Rand `line`, Körper `surface`, Kopfstreifen `surface-raised`.
- **Logo und Tab-Titel.**
  - `AppLogo.vue` ist das daybreak-Icon der Marke (Wolke plus Linien-Sonne, Farben über Tokens).
  - `public/favicon.svg` ist die Original-Datei der Marke.
  - Tab-Titel: `<Seite> · daybreak`, Standard `daybreak · cloudypanda`.
- **Nur Anzeige: Aufgabenstatus „In Arbeit“.** Gespeichert sind nur „offen“ und „abgeschlossen“. Auf Konten- und Aufgabenseite heißt eine offene Aufgabe mit gebuchter Zeit „In Arbeit“.
- **Leere Zustände.** Sie dürfen einen kleinen Wetterwitz machen, zum Beispiel „Klarer Himmel – …“. Fehlermeldungen nicht.

## Datenmodell & API

Keine Änderungen. Neu sind nur CSS-Tokens in `app/assets/css/main.css`:
- `--warnung`, `--info` und die `*-subtle`-Flächen
- `--line-strong`, `--secondary-hover`
- die Tailwind-Farben `raised`, `overlay`, `line-strong`

## Offen

- **Hellen Modus.** Die Marke sieht „Hell“ als Alternative vor; v1 bleibt dunkel.
- **Kontofarben im Markenton.** Die Pastelltöne könnten näher an die Markentöne rücken. Das braucht eine Abstimmung, weil die Akzente anderer Tools reserviert sind.
- **Kalender, Blocker plus Kategorie.** Ein Tag mit Blocker und Urlaub zugleich ist optisch nicht gesondert geprüft.
- **Heute, Tagesabschluss per Link.** `/?abschluss=1` öffnete das Tagesabschluss-Sheet im Test nicht. Die Logik dazu ist unverändert; ob das vorher schon so war, ist nicht geprüft.
