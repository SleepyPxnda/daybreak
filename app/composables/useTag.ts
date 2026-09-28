import type { TimelineBlock } from '~/utils/timeline'

/** useFetch-Keys, die nach jeder Block-Änderung neu geladen werden. */
export const TAG_KEYS = ['tag-bloecke', 'tag-info', 'woche-bloecke', 'woche-tage', 'kalender-tage', 'urlaub', 'saldo', 'aufgaben', 'aufgaben-in-arbeit', 'zuletzt']

/** Blöcke (inkl. Vorlagen-Materialisierung), Tagesinfo und Saldo für einen Tag. */
export function useTag(datum: Ref<string>) {
  const bloeckeAntwort = useFetch('/api/blocks', {
    key: 'tag-bloecke',
    query: { von: datum, bis: datum },
    default: () => ({ bloecke: [] as TimelineBlock[], konflikte: [] as { vorlageId: number, datum: string }[] }),
  })
  const tagAntwort = useFetch('/api/tage', { key: 'tag-info', query: { von: datum, bis: datum } })
  const saldoAntwort = useFetch('/api/saldo', { key: 'saldo' })

  return {
    bloecke: computed(() => bloeckeAntwort.data.value.bloecke as TimelineBlock[]),
    konflikte: computed(() => bloeckeAntwort.data.value.konflikte),
    info: computed(() => tagAntwort.data.value?.[0]),
    saldo: saldoAntwort.data,
  }
}
