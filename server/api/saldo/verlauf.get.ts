import { saldoVerlauf } from '#shared/utils/saldo'
import { heute } from '#shared/utils/zeit'

// Stundenkonto-Verlauf (Plan §3.4/§5.4): Monatsdelta + Kontostand am Monatsende seit Startdatum
export default defineEventHandler(async () => {
  return saldoVerlauf(await ladeSaldoEingabe(heute(), await ladeEinstellungen()))
})
