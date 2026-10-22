# Daybreak – Dokumentation

Persönliches Arbeits-Dashboard: Zeit planen und buchen, Stundenkonto, Urlaub, Merker, Daily-Themen, Notizen.
Die Spezifikation steht in [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md), die Arbeitsregeln in [`CLAUDE.md`](../CLAUDE.md).
Hier ist dokumentiert, was pro Phase **tatsächlich** gebaut wurde – inklusive Entscheidungen und Abweichungen vom Plan.

| Phase | Thema | Stand |
|---|---|---|
| [0](phase-0-setup.md) | Setup: Nuxt, Theme, DB, Docker, CI | fertig (Docker/CI ungetestet) |
| [1](phase-1-zeit.md) | Zeit: Timeline, Schnelleingabe, Stundenkonto, Vorlagen | fertig |
| [2](phase-2-merker.md) | Merker, Warten auf, Daily-Themen, Befehlspalette | fertig |
| [3](phase-3-notizen.md) | Notizen: Markdown-Editor, Tags, Suche, Anpinnen | fertig |
| [4](phase-4-kalender.md) | Kalender, Urlaubskonto, Woche | fertig |
| [5](phase-5-uebersicht.md) | Übersicht: Konto → Aufgabe → Tage, Stundenkonto-Verlauf | fertig |
| [6](phase-6-erinnerungen.md) | Browser-Erinnerungen ans Buchen | fertig |
| [7](phase-7-cloudypanda.md) | Redesign nach dem cloudypanda-Markensystem | fertig |

## Schnellstart

```bash
pnpm install
pnpm db:seed      # optional: leert die DB und füllt sie mit ~2 Monaten Testdaten rund um heute
pnpm dev          # http://127.0.0.1:3000 – Migrationen laufen beim Start automatisch
```

Weitere Befehle: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:generate`.

## Wichtigste Bedienung auf einen Blick

| Aktion | Wie |
|---|---|
| Befehlspalette (buchen, Merker, suchen, navigieren) | `Strg+K` / `⌘K` |
| Zeit buchen | `2h PROJ-123 Review`, `9:00-10:30 mtg`, `p 30m` |
| Zeit planen | `plan 3h PROJ-123 morgen` |
| Merker / Daily-Thema / Warten auf | `t …`, `d …`, `w Tim: … bis fr` |
| Neue Notiz | `n Titel` |
| Block anlegen | auf der Timeline ziehen |
| Timeline zoomen / verschieben | `Strg`+Mausrad / `Shift`+Mausrad oder mittlere Maustaste |
| Urlaub eintragen | Kalender: Tage ziehen → „Urlaub“ |

Details in den Phasen-Dokumenten.
