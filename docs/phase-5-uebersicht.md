# Phase 5 – Übersicht

Gebuchte Zeit gruppiert nach Konto → Aufgabe → Tage und der Verlauf des Stundenkontos.

## Bedienung

### Übersicht (`/uebersicht`)
- **Zeitraum** oben rechts umschalten: **Woche**, **Monat** (Standard) oder **Frei**.
  - Woche/Monat mit `‹ ›` blättern (`?modus=woche&datum=<Datum>`).
  - Frei: zwei Datumsfelder (`?modus=frei&von=…&bis=…`), höchstens ein Jahr. Beim Wechsel auf „Frei“ wird der gerade angezeigte Zeitraum übernommen.
- **Summe:** gebucht / Soll des Zeitraums mit Differenz (±).
- **Tabelle Konto → Aufgabe → Tage:** Stunden und Anteil (Prozent + Balken) je Ebene.
  - Konten sind aufgeklappt, ein Klick klappt sie zu. Ein Klick auf eine Aufgabe zeigt ihre Tage; „Alle Tage zeigen“ klappt alles auf.
  - Direkt aufs Konto gebuchte Zeit steht als eigene Zeile **„ohne Aufgabe“**.
  - Tageszeilen zeigen die Block-Notizen des Tages und verlinken auf den Tag („Heute“-Seite); „öffnen“ führt zur Aufgaben-Detailseite.
- **Monatsabschluss** (vierter Modus, `?modus=abschluss&datum=<Datum>`, Monat blättern) – zum Übertragen ins Firmentool, Tag für Tag:
  - Tageszeile: Datum (Link auf den Tag), **Start – Ende**, **Pause**, Feiertag/Tagestyp, Tagesnotiz, **Ist / Soll**. Vergangene Arbeitstage mit Soll, aber ohne Buchung sind mit „keine Buchung“ markiert; zukünftige Tage sind gedimmt.
  - Darunter je **Konto** eine Zeile mit Summe und den **Keys** der gebuchten Aufgaben (ohne Key: Titel; Blöcke ohne Aufgabe: Block-Notiz).
  - Oben die Monatssumme (Ist / Soll, ±, Pausen), unten die **Monatssumme je Konto**.
  - Wochenenden ohne Buchung werden ausgeblendet, Feiertage und Abwesenheiten bleiben sichtbar.
  - Umschalter **h:mm / Dezimal**: alle Dauern (Pause, Ist/Soll, Konten, Summen, Saldo) wahlweise in Dezimalstunden (1:15 → 1,25, 2:30 → 2,5); Start/Ende bleiben Uhrzeiten. Die Wahl bleibt per Cookie `daybreak-abschluss-dezimal` erhalten.
- Rechts **Stundenkonto:** Linie mit dem Kontostand am Monatsende (Stunden), Tooltip mit Stand und Monatsdelta; darunter die Monate absteigend mit Delta und Stand. Der laufende Monat ist als „laufend“ markiert (Stand bis gestern).

## Fachregeln & Entscheidungen

Reine Funktionen in `shared/utils/uebersicht.ts` und `shared/utils/saldo.ts` (Tests: `tests/uebersicht.test.ts`, `tests/saldo.test.ts`).

- **Nur gebuchte Arbeitsblöcke** zählen (wie die Ist-Zeit); geplante Blöcke und Pausen erscheinen nicht.
- **Anteil** bezieht sich immer auf die Ebene darüber: Konto am Zeitraum, Aufgabe am Konto, Tag an der Aufgabe.
- **Sortierung:** Konten und Aufgaben nach Stunden absteigend, Tage chronologisch. Archivierte Konten und abgeschlossene Aufgaben bleiben enthalten (Plan §3.1).
- **Block-Notizen** werden pro Tag gesammelt, getrimmt und ohne Duplikate angezeigt.
- **Monatsabschluss** (`monatsabschluss`, Ergänzung zum Plan auf Wunsch nach Phase 5): Start = Beginn des ersten, Ende = Ende des letzten *gebuchten Arbeitsblocks*. **Pause = Ende − Start − Ist** – also Pausenblöcke *und* Lücken zusammen, damit Start/Ende/Pause immer genau die gebuchte Zeit ergeben. Bezeichnung je Block: Aufgaben-Key → Aufgaben-Titel → Block-Notiz, pro Konto und Tag ohne Duplikate. Konten nach Stunden absteigend.
- **Dezimalstunden** (`formatDezimal` in `shared/utils/zeit.ts`): deutsches Format mit höchstens zwei Nachkommastellen, ohne Nullen am Ende (8:00 → 8, 0:20 → 0,33). Im 15-min-Raster ist das exakt; `formatSaldo` nimmt die Formatfunktion als optionalen zweiten Parameter.
- **Stundenkonto-Verlauf** (`saldoVerlauf`): vom Monat des Startdatums bis zum laufenden Monat; Delta = Σ Tagesdelta des Monats (nur Tage ab Startdatum bis gestern), Stand = Kontostand am Monatsende. Der Stand des letzten Monats ist identisch mit „Konto bis gestern“ im Saldo-Widget. Liegt das Startdatum in der Zukunft, ist der Verlauf leer.
- **Chart:** shadcn-vue `chart` (Unovis, neue Abhängigkeiten `@unovis/vue`, `@unovis/ts`), nur clientseitig gerendert (`<ClientOnly>`). Die Änderungen, die `shadcn-vue add chart` an `main.css` vornehmen wollte (Google-Fonts-Import, Base-Layer), wurden verworfen – die Schrift kommt weiter lokal über `@fontsource-variable/*`.
- **Umbau:** Das Laden von Ist-Zeiten und Tagesabweichungen fürs Stundenkonto liegt jetzt in `server/utils/saldo.ts` (`ladeSaldoEingabe`) und wird von `/api/saldo` und `/api/saldo/verlauf` gemeinsam genutzt; die Abfrage gebuchter Arbeitsblöcke (`ladeGebuchteArbeit` in `server/utils/blockAnsicht.ts`) teilen sich `/api/uebersicht` und `/api/uebersicht/abschluss`. Die Seite ist in `components/uebersicht/KontoBaum.vue` und `MonatsAbschluss.vue` aufgeteilt, damit nur die aktive Ansicht lädt. Die ungenutzte `PagePlaceholder.vue` ist entfernt.

## Datenmodell & API

Keine Schemaänderung.

| Route | Zweck |
|---|---|
| `GET /api/uebersicht?von&bis` | `{ gesamt, soll, konten: [{ kontoId, name, farbe, minuten, anteil, aufgaben: [{ aufgabeId \| null, key, titel, minuten, anteil, tage: [{ datum, minuten, anteil, notizen }] }] }] }` – Zeitraum max. 1 Jahr |
| `GET /api/uebersicht/abschluss?von&bis` | pro Tag `{ datum, soll, start, ende, ist, pause, typ, feiertag, istArbeitstag, notiz, konten: [{ kontoId, name, farbe, minuten, bezeichnungen }] }` |
| `GET /api/saldo/verlauf` | `[{ monat: 'YYYY-MM', delta, stand, laufend }]` seit Startdatum des Stundenkontos |

## Offen / bekannte Grenzen

- Nicht im Browser geprüft (Chart-Darstellung, Tooltip, Auf-/Zuklappen).
- Der Verlauf zeigt immer alle Monate seit dem Startdatum, unabhängig vom gewählten Zeitraum.
- Keine Exporte (Plan: Nicht-Ziel).
