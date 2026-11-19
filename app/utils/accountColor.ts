import type { AccountColor } from '#shared/utils/accounts'

interface ColorClasses {
  /** Tinted surface with border in the account color, text in ink (blocks, chips) */
  surface: string
  /** Small color dot */
  dot: string
}

// Full class names so Tailwind finds them when scanning
const CLASSES: Record<AccountColor, ColorClasses> = {
  lavendel: { surface: 'bg-konto-lavendel/18 text-foreground ring-1 ring-inset ring-konto-lavendel/55', dot: 'bg-konto-lavendel' },
  pfirsich: { surface: 'bg-konto-pfirsich/18 text-foreground ring-1 ring-inset ring-konto-pfirsich/55', dot: 'bg-konto-pfirsich' },
  mint: { surface: 'bg-konto-mint/18 text-foreground ring-1 ring-inset ring-konto-mint/55', dot: 'bg-konto-mint' },
  himmel: { surface: 'bg-konto-himmel/18 text-foreground ring-1 ring-inset ring-konto-himmel/55', dot: 'bg-konto-himmel' },
  rose: { surface: 'bg-konto-rose/18 text-foreground ring-1 ring-inset ring-konto-rose/55', dot: 'bg-konto-rose' },
  butter: { surface: 'bg-konto-butter/18 text-foreground ring-1 ring-inset ring-konto-butter/55', dot: 'bg-konto-butter' },
  salbei: { surface: 'bg-konto-salbei/18 text-foreground ring-1 ring-inset ring-konto-salbei/55', dot: 'bg-konto-salbei' },
  flieder: { surface: 'bg-konto-flieder/18 text-foreground ring-1 ring-inset ring-konto-flieder/55', dot: 'bg-konto-flieder' },
}

const NEUTRAL: ColorClasses = { surface: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border', dot: 'bg-muted-foreground' }

export function accountColorClasses(color: string | null | undefined): ColorClasses {
  return (color && CLASSES[color as AccountColor]) || NEUTRAL
}
