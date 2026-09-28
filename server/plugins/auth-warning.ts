export default defineNitroPlugin(() => {
  if (!process.env.DAYBREAK_PASSWORD) {
    console.warn('[daybreak] DAYBREAK_PASSWORD ist nicht gesetzt – die App läuft ohne Zugangsschutz.')
  }
})
