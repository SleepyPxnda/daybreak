import { naechsterUrlaub } from '#shared/utils/urlaub'
import { heute as heuteDatum, plusTage } from '#shared/utils/zeit'

// Heute-Karte „Nächster Urlaub“ + Erinnerung ab einstellbarem Vorlauf
export default defineEventHandler(async () => {
  const heute = heuteDatum()
  const einstellungen = await ladeEinstellungen()
  // Etwas Vorlauf nach hinten, damit ein laufender Urlaub vollständig erkannt wird
  const tage = await ladeTagEintraege(plusTage(heute, -60), plusTage(heute, 366))
  const urlaub = naechsterUrlaub(heute, tage, einstellungen)
  return {
    urlaub,
    erinnern: !!urlaub && !urlaub.laeuft && urlaub.tageBis <= einstellungen.urlaubErinnerungTage,
    erinnerungText: einstellungen.urlaubErinnerungText,
  }
})
