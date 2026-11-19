/** ISO weekdays 1 = Mon ... 7 = Sun with short label */
export const WEEKDAYS = [
  { nr: 1, short: 'Mo' },
  { nr: 2, short: 'Di' },
  { nr: 3, short: 'Mi' },
  { nr: 4, short: 'Do' },
  { nr: 5, short: 'Fr' },
  { nr: 6, short: 'Sa' },
  { nr: 7, short: 'So' },
] as const

export function weekdaysText(days: number[]): string {
  const sorted = [...days].sort()
  if (sorted.join() === '1,2,3,4,5') return 'Mo–Fr'
  return sorted.map(t => WEEKDAYS[t - 1]?.short).join(', ')
}
