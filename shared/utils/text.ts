/** Lowercases text for case-insensitive comparison (German locale). Does not trim. */
export function normalizeForComparison(text: string): string {
  return text.toLocaleLowerCase('de')
}
