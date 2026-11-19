/** Pastel palette for accounts (tokens `--account-*` in main.css). */
export const ACCOUNT_COLORS = ['lavender', 'peach', 'mint', 'sky', 'rose', 'butter', 'sage', 'lilac'] as const

export type AccountColor = (typeof ACCOUNT_COLORS)[number]
