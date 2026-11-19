/** Pastel palette for accounts (tokens `--konto-*` in main.css). */
export const ACCOUNT_COLORS = ['lavendel', 'pfirsich', 'mint', 'himmel', 'rose', 'butter', 'salbei', 'flieder'] as const

export type AccountColor = (typeof ACCOUNT_COLORS)[number]
