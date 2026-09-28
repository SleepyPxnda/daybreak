// Optionaler Zugangsschutz (Plan §9): Basic Auth, wenn DAYBREAK_PASSWORD gesetzt ist.
export default defineEventHandler((event) => {
  const password = process.env.DAYBREAK_PASSWORD
  if (!password || event.path === '/api/health') return

  if (!isValidBasicAuth(getHeader(event, 'authorization'), password)) {
    setHeader(event, 'WWW-Authenticate', 'Basic realm="Daybreak", charset="UTF-8"')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
