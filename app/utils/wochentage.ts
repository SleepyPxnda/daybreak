/** ISO-Wochentage 1 = Mo … 7 = So mit Kurzlabel */
export const WOCHENTAGE = [
  { nr: 1, kurz: 'Mo' },
  { nr: 2, kurz: 'Di' },
  { nr: 3, kurz: 'Mi' },
  { nr: 4, kurz: 'Do' },
  { nr: 5, kurz: 'Fr' },
  { nr: 6, kurz: 'Sa' },
  { nr: 7, kurz: 'So' },
] as const

export function wochentageText(tage: number[]): string {
  const sortiert = [...tage].sort()
  if (sortiert.join() === '1,2,3,4,5') return 'Mo–Fr'
  return sortiert.map(t => WOCHENTAGE[t - 1]?.kurz).join(', ')
}
