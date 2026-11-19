import type { TimelineBlock } from '~/utils/timeline'

/** useFetch keys that are reloaded after every block change. */
export const DAY_KEYS = ['day-blocks', 'day-info', 'week-blocks', 'week-days', 'calendar-days', 'vacation', 'next-vacation', 'balance', 'tasks', 'tasks-in-progress', 'recent']

/** Blocks (incl. template materialization), day info and balance for one day. */
export function useDay(date: Ref<string>) {
  const blocksResponse = useFetch('/api/blocks', {
    key: 'day-blocks',
    query: { from: date, to: date },
    default: () => ({ blocks: [] as TimelineBlock[], conflicts: [] as { templateId: number, date: string }[] }),
  })
  const dayResponse = useFetch('/api/days', { key: 'day-info', query: { from: date, to: date } })
  const balanceResponse = useFetch('/api/balance', { key: 'balance' })

  return {
    blocks: computed(() => blocksResponse.data.value.blocks as TimelineBlock[]),
    conflicts: computed(() => blocksResponse.data.value.conflicts),
    info: computed(() => dayResponse.data.value?.[0]),
    balance: balanceResponse.data,
  }
}
