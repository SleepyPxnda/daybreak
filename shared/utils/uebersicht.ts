import type { BlockBasis } from './bloecke'
import { dauer } from './bloecke'
import type { Datum } from './zeit'

/** Block mit Anzeige-Infos, wie ihn `blockMitAnzeige` liefert. */
export interface UebersichtBlock extends BlockBasis {
  kontoId: number | null
  kontoName: string | null
  kontoFarbe: string | null
  aufgabeId: number | null
  aufgabeKey: string | null
  aufgabeTitel: string | null
  notiz: string | null
}

export interface UebersichtTag {
  datum: Datum
  minuten: number
  /** Anteil an der Aufgabe (0–1) */
  anteil: number
  notizen: string[]
}

export interface UebersichtAufgabe {
  /** null = direkt aufs Konto gebucht („ohne Aufgabe“) */
  aufgabeId: number | null
  key: string | null
  titel: string | null
  minuten: number
  /** Anteil am Konto (0–1) */
  anteil: number
  tage: UebersichtTag[]
}

export interface UebersichtKonto {
  kontoId: number
  name: string
  farbe: string | null
  minuten: number
  /** Anteil an der Gesamtzeit (0–1) */
  anteil: number
  aufgaben: UebersichtAufgabe[]
}

export interface Uebersicht {
  gesamt: number
  konten: UebersichtKonto[]
}

function anteil(teil: number, ganzes: number): number {
  return ganzes > 0 ? teil / ganzes : 0
}

const nachMinuten = (a: { minuten: number }, b: { minuten: number }) => b.minuten - a.minuten

/**
 * Plan §5.4: gebuchte Arbeitszeit gruppiert Konto → Aufgabe → Tage.
 * Anteil je Ebene bezogen auf die Ebene darüber; sortiert nach Stunden absteigend, Tage chronologisch.
 * Geplante Blöcke und Pausen zählen nicht (wie Ist-Zeit).
 */
export function gruppiereUebersicht(bloecke: UebersichtBlock[]): Uebersicht {
  const konten = new Map<number, { konto: UebersichtKonto, aufgaben: Map<number | null, UebersichtAufgabe & { tagMap: Map<Datum, UebersichtTag> }> }>()

  for (const b of bloecke) {
    if (b.kind !== 'arbeit' || b.status !== 'gebucht' || b.kontoId == null) continue
    const minuten = dauer(b)

    let k = konten.get(b.kontoId)
    if (!k) {
      k = { konto: { kontoId: b.kontoId, name: b.kontoName ?? '', farbe: b.kontoFarbe, minuten: 0, anteil: 0, aufgaben: [] }, aufgaben: new Map() }
      konten.set(b.kontoId, k)
    }
    k.konto.minuten += minuten

    let a = k.aufgaben.get(b.aufgabeId)
    if (!a) {
      a = { aufgabeId: b.aufgabeId, key: b.aufgabeKey, titel: b.aufgabeTitel, minuten: 0, anteil: 0, tage: [], tagMap: new Map() }
      k.aufgaben.set(b.aufgabeId, a)
    }
    a.minuten += minuten

    let t = a.tagMap.get(b.datum)
    if (!t) {
      t = { datum: b.datum, minuten: 0, anteil: 0, notizen: [] }
      a.tagMap.set(b.datum, t)
    }
    t.minuten += minuten
    const notiz = b.notiz?.trim()
    if (notiz && !t.notizen.includes(notiz)) t.notizen.push(notiz)
  }

  const gesamt = [...konten.values()].reduce((s, k) => s + k.konto.minuten, 0)

  const ergebnis = [...konten.values()].map(({ konto, aufgaben }) => ({
    ...konto,
    anteil: anteil(konto.minuten, gesamt),
    aufgaben: [...aufgaben.values()].map(({ tagMap, ...a }) => ({
      ...a,
      anteil: anteil(a.minuten, konto.minuten),
      tage: [...tagMap.values()]
        .map(t => ({ ...t, anteil: anteil(t.minuten, a.minuten) }))
        .sort((x, y) => x.datum.localeCompare(y.datum)),
    })).sort(nachMinuten),
  })).sort(nachMinuten)

  return { gesamt, konten: ergebnis }
}

export interface AbschlussKonto {
  kontoId: number
  name: string
  farbe: string | null
  minuten: number
  /** Aufgaben-Keys, sonst -Titel, bei Blöcken ohne Aufgabe die Block-Notiz – ohne Duplikate */
  bezeichnungen: string[]
}

export interface AbschlussTag {
  datum: Datum
  soll: number
  /** Beginn des ersten / Ende des letzten gebuchten Arbeitsblocks (null ohne Buchung) */
  start: number | null
  ende: number | null
  ist: number
  /** Ende − Start − Ist: Pausenblöcke und Lücken zusammen */
  pause: number
  konten: AbschlussKonto[]
}

/** Bezeichnung eines Blocks für den Abschluss: Key → Titel → Notiz. */
function blockBezeichnung(b: UebersichtBlock): string | undefined {
  return b.aufgabeKey?.trim() || b.aufgabeTitel?.trim() || b.notiz?.trim() || undefined
}

/**
 * Monatsabschluss (Wunsch nach Phase 5): pro Tag Start, Ende, Pause und die gebuchte Zeit je Konto,
 * zum Übertragen ins Firmentool. Pause = Ende − Start − Ist, damit Start/Ende/Pause immer zur Ist-Zeit passen.
 * Liefert alle übergebenen Tage (auch ohne Buchung), Konten nach Stunden absteigend.
 */
export function monatsabschluss(bloecke: UebersichtBlock[], tage: { datum: Datum, soll: number }[]): AbschlussTag[] {
  const gebucht = bloecke.filter(b => b.kind === 'arbeit' && b.status === 'gebucht' && b.kontoId != null)

  return tage.map(({ datum, soll }) => {
    const amTag = gebucht.filter(b => b.datum === datum)
    if (!amTag.length) return { datum, soll, start: null, ende: null, ist: 0, pause: 0, konten: [] }

    const konten = new Map<number, AbschlussKonto>()
    for (const b of amTag) {
      const kontoId = b.kontoId as number
      let k = konten.get(kontoId)
      if (!k) {
        k = { kontoId, name: b.kontoName ?? '', farbe: b.kontoFarbe, minuten: 0, bezeichnungen: [] }
        konten.set(kontoId, k)
      }
      k.minuten += dauer(b)
      const bezeichnung = blockBezeichnung(b)
      if (bezeichnung && !k.bezeichnungen.includes(bezeichnung)) k.bezeichnungen.push(bezeichnung)
    }

    const start = Math.min(...amTag.map(b => b.start))
    const ende = Math.max(...amTag.map(b => b.ende))
    const ist = amTag.reduce((s, b) => s + dauer(b), 0)
    return { datum, soll, start, ende, ist, pause: ende - start - ist, konten: [...konten.values()].sort(nachMinuten) }
  })
}
