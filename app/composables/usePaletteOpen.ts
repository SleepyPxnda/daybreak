/** Open state of the Ctrl+K command palette (global, e.g. can also be opened from the sidebar) */
export function usePaletteOpen() {
  return useState('palette-open', () => false)
}
