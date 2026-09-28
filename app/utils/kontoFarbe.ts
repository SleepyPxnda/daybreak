import type { KontoFarbe } from '#shared/utils/konten'

interface FarbKlassen {
  /** Pastellfläche mit dunklem Text (Blöcke, Chips) */
  flaeche: string
  /** Kleiner Farbpunkt */
  punkt: string
}

// Volle Klassennamen, damit Tailwind sie beim Scannen findet
const KLASSEN: Record<KontoFarbe, FarbKlassen> = {
  lavendel: { flaeche: 'bg-konto-lavendel text-konto-lavendel-fg', punkt: 'bg-konto-lavendel' },
  pfirsich: { flaeche: 'bg-konto-pfirsich text-konto-pfirsich-fg', punkt: 'bg-konto-pfirsich' },
  mint: { flaeche: 'bg-konto-mint text-konto-mint-fg', punkt: 'bg-konto-mint' },
  himmel: { flaeche: 'bg-konto-himmel text-konto-himmel-fg', punkt: 'bg-konto-himmel' },
  rose: { flaeche: 'bg-konto-rose text-konto-rose-fg', punkt: 'bg-konto-rose' },
  butter: { flaeche: 'bg-konto-butter text-konto-butter-fg', punkt: 'bg-konto-butter' },
  salbei: { flaeche: 'bg-konto-salbei text-konto-salbei-fg', punkt: 'bg-konto-salbei' },
  flieder: { flaeche: 'bg-konto-flieder text-konto-flieder-fg', punkt: 'bg-konto-flieder' },
}

const NEUTRAL: FarbKlassen = { flaeche: 'bg-muted text-muted-foreground', punkt: 'bg-muted-foreground' }

export function kontoFarbKlassen(farbe: string | null | undefined): FarbKlassen {
  return (farbe && KLASSEN[farbe as KontoFarbe]) || NEUTRAL
}
