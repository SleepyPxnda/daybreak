import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'vue-sonner'
import type { QiBlock, QiTodo, QiZiel } from '#shared/utils/quickInput'
import { parseQuickInput } from '#shared/utils/quickInput'
import { TODO_ARTEN } from '#shared/utils/todos'

/** useFetch-Keys der Todo-Listen */
export const TODO_KEYS = ['todos-offen', 'todos-erledigt', 'aufgabe-todos']

function tagText(datum: string): string {
  if (datum === heute()) return 'heute'
  if (datum === plusTage(heute(), 1)) return 'morgen'
  if (datum === plusTage(heute(), -1)) return 'gestern'
  return format(zuDate(datum), 'EEE d. MMM', { locale: de })
}

/**
 * Schnelleingabe (Plan §3.8): Parsen, Vorschau und Ausführen – gemeinsam für die Zeile auf „Heute“
 * und die Strg+K-Befehlspalette.
 * @param datum Tag ohne Datumsangabe (angezeigter Tag)
 */
export function useSchnelleingabe(datum: MaybeRefOrGetter<string>) {
  const text = ref('')
  const { data: konten } = useKonten()
  const { data: aufgaben } = useAlleAufgaben()

  const ergebnis = computed(() => parseQuickInput(text.value, {
    heute: heute(),
    standardDatum: toValue(datum),
    aufgaben: aufgaben.value,
    konten: konten.value,
  }))

  const kontoName = (id: number) => konten.value.find(k => k.id === id)?.name ?? '?'

  function zielText(z: QiZiel): string {
    if (z.typ === 'konto') return kontoName(z.kontoId)
    if (z.typ === 'neueAufgabe') return `neue Aufgabe „${z.titel}“ in ${kontoName(z.kontoId)}`
    const a = aufgaben.value.find(x => x.id === z.aufgabeId)
    return a ? `${a.key ? `${a.key} ` : ''}${a.titel} (${kontoName(a.kontoId)})` : '?'
  }

  function blockVorschau(b: QiBlock): string {
    const zeit = 'dauer' in b.zeit ? formatDauer(b.zeit.dauer) : `${formatUhrzeit(b.zeit.start)}–${formatUhrzeit(b.zeit.ende)}`
    return [
      b.status === 'geplant' ? 'Planen' : 'Buchen',
      tagText(b.datum),
      zeit,
      b.kind === 'pause' ? 'Pause' : b.ziel ? zielText(b.ziel) : undefined,
    ].filter(Boolean).join(' · ')
  }

  function todoVorschau(t: QiTodo): string {
    const art = TODO_ARTEN.find(a => a.art === t.todoArt)!.einzahl
    const teile = [art, t.wer ? `${t.wer}: ${t.text}` : t.text]
    if (t.stichtag) teile.push(`${t.todoArt === 'warten' ? 'nachfassen' : 'fällig'} ${tagText(t.stichtag)}`)
    return teile.join(' · ')
  }

  /** Einzeilige Beschreibung dessen, was Enter tun würde (null = nichts auszuführen) */
  const vorschau = computed(() => {
    const r = ergebnis.value
    if (r.art === 'block') return { text: blockVorschau(r), notiz: r.notiz }
    if (r.art === 'todo') return { text: todoVorschau(r), notiz: undefined }
    if (r.art === 'notiz') return { text: `Neue Notiz · ${r.titel} – öffnet den Editor`, notiz: undefined }
    return null
  })

  const laeuft = ref(false)

  async function blockAnlegen(r: QiBlock, ziel: QiZiel | undefined): Promise<boolean> {
    let ids: { aufgabeId: number | null, kontoId: number | null } = { aufgabeId: null, kontoId: null }
    if (ziel?.typ === 'neueAufgabe') {
      const neu = await aktion(() => api<{ id: number }>('/api/aufgaben', { method: 'POST', body: { kontoId: ziel.kontoId, titel: ziel.titel } }))
      if (!neu) return false
      ids = { aufgabeId: neu.id, kontoId: null }
    }
    else if (ziel?.typ === 'aufgabe') ids = { aufgabeId: ziel.aufgabeId, kontoId: null }
    else if (ziel?.typ === 'konto') ids = { aufgabeId: null, kontoId: ziel.kontoId }

    const ok = await aktion(() => api('/api/blocks', {
      method: 'POST',
      body: { datum: r.datum, kind: r.kind, status: r.status, ...r.zeit, ...ids, notiz: r.notiz ?? null },
    }), [...TAG_KEYS, ...STAMMDATEN_KEYS])
    if (ok) toast.success(blockVorschau({ ...r, ziel }))
    return !!ok
  }

  async function todoAnlegen(t: QiTodo): Promise<boolean> {
    const ok = await aktion(() => api('/api/todos', {
      method: 'POST',
      body: {
        art: t.todoArt,
        text: t.text,
        wer: t.wer ?? null,
        ...(t.todoArt === 'warten' ? { nachfassenAm: t.stichtag ?? null } : {}),
        ...(t.todoArt === 'merker' ? { faelligAm: t.stichtag ?? null } : {}),
      },
    }), TODO_KEYS)
    if (ok) toast.success(`${todoVorschau(t)} – gespeichert`)
    return !!ok
  }

  /**
   * Führt das aktuelle Ergebnis aus. Liefert true, wenn etwas angelegt wurde (Eingabe wird geleert).
   * `gewaehlt` = Auswahl bei mehrdeutigem Ziel.
   */
  async function ausfuehren(gewaehlt?: QiZiel): Promise<boolean> {
    const r = ergebnis.value
    if (r.art === 'fehler') {
      toast.error(r.meldung)
      return false
    }
    if (r.art !== 'block' && r.art !== 'todo' && r.art !== 'notiz') return false
    const ziel = r.art === 'block' ? gewaehlt ?? r.ziel : undefined
    if (r.art === 'block' && r.kind === 'arbeit' && !ziel) return false // Kandidaten werden angezeigt

    laeuft.value = true
    try {
      const ok = r.art === 'block'
        ? await blockAnlegen(r, ziel)
        : r.art === 'todo' ? await todoAnlegen(r) : await neueNotiz(r.titel)
      if (ok) text.value = ''
      return ok
    }
    finally {
      laeuft.value = false
    }
  }

  return { text, ergebnis, vorschau, zielText, laeuft, ausfuehren }
}
