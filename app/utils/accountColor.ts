import type { AccountColor } from '#shared/utils/accounts'

interface ColorClasses {
  /** Tinted surface with border in the account color, text in ink (blocks, chips) */
  surface: string
  /** Small color dot */
  dot: string
}

// Full class names so Tailwind finds them when scanning
const CLASSES: Record<AccountColor, ColorClasses> = {
  lavender: { surface: 'bg-account-lavender/18 text-foreground ring-1 ring-inset ring-account-lavender/55', dot: 'bg-account-lavender' },
  peach: { surface: 'bg-account-peach/18 text-foreground ring-1 ring-inset ring-account-peach/55', dot: 'bg-account-peach' },
  mint: { surface: 'bg-account-mint/18 text-foreground ring-1 ring-inset ring-account-mint/55', dot: 'bg-account-mint' },
  sky: { surface: 'bg-account-sky/18 text-foreground ring-1 ring-inset ring-account-sky/55', dot: 'bg-account-sky' },
  rose: { surface: 'bg-account-rose/18 text-foreground ring-1 ring-inset ring-account-rose/55', dot: 'bg-account-rose' },
  butter: { surface: 'bg-account-butter/18 text-foreground ring-1 ring-inset ring-account-butter/55', dot: 'bg-account-butter' },
  sage: { surface: 'bg-account-sage/18 text-foreground ring-1 ring-inset ring-account-sage/55', dot: 'bg-account-sage' },
  lilac: { surface: 'bg-account-lilac/18 text-foreground ring-1 ring-inset ring-account-lilac/55', dot: 'bg-account-lilac' },
}

const NEUTRAL: ColorClasses = { surface: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border', dot: 'bg-muted-foreground' }

export function accountColorClasses(color: string | null | undefined): ColorClasses {
  return (color && CLASSES[color as AccountColor]) || NEUTRAL
}
