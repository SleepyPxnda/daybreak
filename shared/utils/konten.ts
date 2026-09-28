/** Pastell-Palette für Konten (Tokens `--konto-*` in main.css, Plan §6). */
export const KONTO_FARBEN = ['lavendel', 'pfirsich', 'mint', 'himmel', 'rose', 'butter', 'salbei', 'flieder'] as const

export type KontoFarbe = (typeof KONTO_FARBEN)[number]
