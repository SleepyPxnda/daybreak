import type { Zeitraum } from '#shared/utils/bloecke'
import type { BlockEntwurf } from '~/components/timeline/BlockDialog.vue'
import type { VorlageFormular } from '~/components/VorlageDialog.vue'
import type { TimelineBlock } from '~/utils/timeline'

export type BlockMenueAktion = 'umschalten' | 'teilen' | 'loeschen' | 'bearbeiten' | 'wiederkehrend'

/**
 * Timeline-Aktionen für Heute und Woche: anlegen, ändern, Menü, Drop von Aufgaben/Merkern.
 * Liefert zusätzlich den Zustand für BlockDialog und VorlageDialog, die die Seite rendert.
 */
export function useBlockBearbeitung() {
  const jetzt = useJetzt()
  const { data: offeneTodos } = useOffeneTodos()

  const blockDialog = ref(false)
  const bearbeiteterBlock = ref<TimelineBlock | null>(null)
  const entwurf = ref<BlockEntwurf | null>(null)
  const vorlageDialog = ref(false)
  const vorlageEntwurf = ref<VorlageFormular | null>(null)

  /** Neuer Block: vergangene Zeit ist gebucht, Zukunft geplant */
  function standardStatus(datum: string, ende: number) {
    if (datum < heute()) return 'gebucht' as const
    if (datum > heute()) return 'geplant' as const
    return ende <= (jetzt.value ?? 0) ? 'gebucht' as const : 'geplant' as const
  }

  function entwurfOeffnen(e: BlockEntwurf) {
    bearbeiteterBlock.value = null
    entwurf.value = e
    blockDialog.value = true
  }

  function anlegen(datum: string, z: Zeitraum) {
    entwurfOeffnen({ datum, ...z, status: standardStatus(datum, z.ende) })
  }

  function oeffnen(b: TimelineBlock) {
    entwurf.value = null
    bearbeiteterBlock.value = b
    blockDialog.value = true
  }

  async function aendern(id: number, z: Zeitraum) {
    await aktion(() => api(`/api/blocks/${id}`, { method: 'PATCH', body: { ...z } }), TAG_KEYS)
  }

  async function menue(aktionName: BlockMenueAktion, b: TimelineBlock, minute: number) {
    switch (aktionName) {
      case 'umschalten':
        await aktion(() => api(`/api/blocks/${b.id}`, { method: 'PATCH', body: { status: b.status === 'geplant' ? 'gebucht' : 'geplant' } }), TAG_KEYS)
        break
      case 'teilen': {
        const bei = minute > b.start && minute < b.ende ? minute : aufRaster((b.start + b.ende) / 2)
        await aktion(() => api(`/api/blocks/${b.id}/teilen`, { method: 'POST', body: { bei } }), TAG_KEYS)
        break
      }
      case 'loeschen':
        await aktion(() => api(`/api/blocks/${b.id}`, { method: 'DELETE' }), TAG_KEYS)
        break
      case 'bearbeiten':
        oeffnen(b)
        break
      case 'wiederkehrend':
        vorlageEntwurf.value = {
          name: null,
          aufgabeId: b.aufgabeId,
          kontoId: b.kontoId,
          start: b.start,
          ende: b.ende,
          wochentage: [wochentag(b.datum)],
          intervallWochen: 1,
          gueltigAb: b.datum,
          gueltigBis: null,
          ausBlockId: b.id,
        }
        vorlageDialog.value = true
        break
    }
  }

  /** Drop aus „Aufgaben in Arbeit“: 1-h-Block ab der Drop-Position */
  async function ablegen(datum: string, aufgabeId: number, start: number) {
    const ende = Math.min(start + 60, TAG_MIN)
    await aktion(() => api('/api/blocks', {
      method: 'POST',
      body: { datum, kind: 'arbeit', status: standardStatus(datum, ende), start, ende, aufgabeId },
    }), TAG_KEYS)
  }

  /** Drop eines Merkers: 30 min geplant, Text als Notiz; ohne Bezug Ziel im Dialog wählen */
  async function ablegenMerker(datum: string, todoId: number, start: number) {
    const merker = offeneTodos.value.find(t => t.id === todoId)
    if (!merker) return
    const ende = Math.min(start + 30, TAG_MIN)
    if (!merker.aufgabeId && !merker.kontoId) {
      entwurfOeffnen({ datum, start, ende, status: 'geplant', notiz: merker.text })
      return
    }
    await aktion(() => api('/api/blocks', {
      method: 'POST',
      body: {
        datum,
        kind: 'arbeit',
        status: 'geplant',
        start,
        ende,
        ...(merker.aufgabeId ? { aufgabeId: merker.aufgabeId } : { kontoId: merker.kontoId }),
        notiz: merker.text,
      },
    }), TAG_KEYS)
  }

  return {
    jetzt,
    blockDialog,
    bearbeiteterBlock,
    entwurf,
    vorlageDialog,
    vorlageEntwurf,
    anlegen,
    oeffnen,
    aendern,
    menue,
    ablegen,
    ablegenMerker,
  }
}
