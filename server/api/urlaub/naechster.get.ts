import { naechsterUrlaub } from '#shared/utils/urlaub'
import { datumsBereich, heute as heuteDatum, plusTage } from '#shared/utils/zeit'

// Heute-Karte „Nächster Urlaub“ + Erinnerung ab einstellbarem Vorlauf
export default defineEventHandler(async () => {
  const heute = heuteDatum()
  const einstellungen = await ladeEinstellungen()
  // Etwas Vorlauf nach hinten, damit ein laufender Urlaub vollständig erkannt wird
  const tage = await ladeTagEintraege(plusTage(heute, -60), plusTage(heute, 366))
  const urlaub = naechsterUrlaub(heute, tage, einstellungen)
  // Bestätigt, wenn alle Urlaubstage im Zeitraum bestätigt sind (neu hinzugekommene Tage heben das auf)
  const urlaubsTage = urlaub ? datumsBereich(urlaub.von, urlaub.bis).map(d => tage[d]).filter(t => t?.typ === 'urlaub' || t?.typ === 'halb_urlaub') : []
  return {
    urlaub: urlaub && { ...urlaub, bestaetigt: urlaubsTage.length > 0 && urlaubsTage.every(t => t!.bestaetigt) },
    erinnern: !!urlaub && !urlaub.laeuft && urlaub.tageBis <= einstellungen.urlaubErinnerungTage,
    erinnerungText: einstellungen.urlaubErinnerungText,
  }
})
