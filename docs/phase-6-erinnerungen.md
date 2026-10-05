# Phase 6 – Erinnerungen

Browser-Benachrichtigungen, die ans Buchen erinnern, wenn heute zu wenig eingetragen ist – sparsam, ohne Spam.

## Bedienung

- **Einstellungen → „Browser-Erinnerungen ans Buchen“** einschalten. Der Browser fragt dabei nach der Erlaubnis; wird sie verweigert, bleibt der Schalter aus.
- **Erinnern nach (Stunden ohne Buchung)** – Standard 2 h.
- **Feierabend-Erinnerung ab** – Standard 16:30.
- Klick auf eine Benachrichtigung holt Daybreak nach vorn und öffnet „Heute“; die Feierabend-Erinnerung öffnet direkt den **Tagesabschluss** (`/?abschluss=1`).

## Fachregeln & Entscheidungen

Regeln als reine Funktion `pruefeErinnerung` in `shared/utils/erinnerung.ts` (Tests: `tests/erinnerung.test.ts`):

- Nur an Tagen mit **Soll > 0** (kein Wochenende, Feiertag, Urlaub, Krank) und nur solange **gebucht < Soll**.
- **Lücke:** Liegt das Ende des letzten *gebuchten* Blocks (bzw. der Arbeitsbeginn, wenn noch nichts gebucht ist) mindestens das eingestellte Intervall zurück → „Seit 11:15 nichts gebucht – kurz nachtragen?“. Danach frühestens wieder nach einem weiteren Intervall. Geplante Blöcke zählen nicht.
- **Feierabend:** Ab der eingestellten Uhrzeit → „Heute 6:15 von 8:00 gebucht – Tagesabschluss machen?“. Höchstens zweimal: zur Uhrzeit und eine Stunde später. Ab Feierabend keine Lücken-Erinnerungen mehr.
- Nachbuchen löst die Bedingung von selbst auf – kein „Erledigt“, kein Snooze.
- Ist Daybreak gerade im Vordergrund (sichtbar + fokussiert), wird **keine** Benachrichtigung gezeigt, die Erinnerung zählt aber als erfolgt.
- Bewusst **nur bei offenem Tab** (Notification API + Timer, Prüfung alle 5 min). Kein Service Worker / Web Push.

## Datenmodell & API

- Neue Settings-Schlüssel (key/value, keine Migration): `erinnerungenAktiv` (bool, Standard aus), `erinnerungLueckeMin` (30–480, 15-min-Raster, Standard 120), `erinnerungFeierabend` (Uhrzeit, Standard 990 = 16:30).
- Client: `app/composables/useErinnerungen.ts`, eingebunden im Default-Layout; lädt `/api/blocks` und `/api/tage` für heute.
- Zeitpunkte der letzten Erinnerungen je Art liegen im `localStorage` (`daybreak-erinnerungen`, pro Tag), damit ein Reload nicht erneut erinnert.

## Offen / bekannte Grenzen

- Benachrichtigungen funktionieren nur in einem **sicheren Kontext** (HTTPS oder `localhost`). Bei Zugriff per `http://<IP>` im LAN bietet der Browser sie nicht an.
- Mehrere offene Daybreak-Tabs teilen sich den `localStorage`-Verlauf; gleichzeitige Prüfungen können im Grenzfall doppelt melden (gleicher `tag` → der Browser ersetzt die ältere Meldung).
