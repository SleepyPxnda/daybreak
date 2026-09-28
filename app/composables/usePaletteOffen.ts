/** Offen-Zustand der Strg+K-Befehlspalette (global, z. B. auch aus der Sidebar öffnen) */
export function usePaletteOffen() {
  return useState('palette-offen', () => false)
}
