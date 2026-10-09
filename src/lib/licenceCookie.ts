// The Pro key as an HttpOnly cookie. JavaScript on the page cannot read it, so
// an XSS that can read localStorage still cannot copy the key. The browser
// sends it on same-origin publishes. The plugin keeps sending the header.

export const LICENCE_COOKIE = 'sd_licence'
const YEAR = 60 * 60 * 24 * 365

/** `key` empty clears the cookie. `secure` is on in production (`VERCEL_ENV`); localhost is http. */
export function licenceCookieHeader(key: string, secure = false): string {
  const bits = [
    `${LICENCE_COOKIE}=${encodeURIComponent(key)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${key ? YEAR : 0}`,
  ]
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

export function readLicenceCookie(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header.join('; ') : (header ?? '')
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== LICENCE_COOKIE) continue
    try {
      return decodeURIComponent(part.slice(eq + 1)).trim()
    } catch {
      return ''
    }
  }
  return ''
}
