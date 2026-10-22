import type { KontoFarbe } from '#shared/utils/konten'

interface FarbKlassen {
  /** Getönte Fläche mit Rand in Kontofarbe, Text in ink (Blöcke, Chips) */
  flaeche: string
  /** Kleiner Farbpunkt */
  punkt: string
}

// Volle Klassennamen, damit Tailwind sie beim Scannen findet
const KLASSEN: Record<KontoFarbe, FarbKlassen> = {
  lavendel: { flaeche: 'bg-konto-lavendel/18 text-foreground ring-1 ring-inset ring-konto-lavendel/55', punkt: 'bg-konto-lavendel' },
  pfirsich: { flaeche: 'bg-konto-pfirsich/18 text-foreground ring-1 ring-inset ring-konto-pfirsich/55', punkt: 'bg-konto-pfirsich' },
  mint: { flaeche: 'bg-konto-mint/18 text-foreground ring-1 ring-inset ring-konto-mint/55', punkt: 'bg-konto-mint' },
  himmel: { flaeche: 'bg-konto-himmel/18 text-foreground ring-1 ring-inset ring-konto-himmel/55', punkt: 'bg-konto-himmel' },
  rose: { flaeche: 'bg-konto-rose/18 text-foreground ring-1 ring-inset ring-konto-rose/55', punkt: 'bg-konto-rose' },
  butter: { flaeche: 'bg-konto-butter/18 text-foreground ring-1 ring-inset ring-konto-butter/55', punkt: 'bg-konto-butter' },
  salbei: { flaeche: 'bg-konto-salbei/18 text-foreground ring-1 ring-inset ring-konto-salbei/55', punkt: 'bg-konto-salbei' },
  flieder: { flaeche: 'bg-konto-flieder/18 text-foreground ring-1 ring-inset ring-konto-flieder/55', punkt: 'bg-konto-flieder' },
}

const NEUTRAL: FarbKlassen = { flaeche: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border', punkt: 'bg-muted-foreground' }

export function kontoFarbKlassen(farbe: string | null | undefined): FarbKlassen {
  return (farbe && KLASSEN[farbe as KontoFarbe]) || NEUTRAL
}
