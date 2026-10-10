// The Pro key as an HttpOnly cookie. JavaScript on the page cannot read it, so
// an XSS that can read localStorage still cannot copy the key. The browser
// sends it on same-origin publishes. The plugin keeps sending the header.
//
// The site answers on two hosts, `escalatokens.com` and `www.escalatokens.com`,
// and neither redirects to the other. A cookie with no `Domain` belongs to the
// one host that set it, so a key pasted on the apex did not exist on `www` —
// which is the host the Figma plugin opens. The cookie is set for the whole
// site, and the host-only copy an older build left behind is expired in the
// same response.

export const LICENCE_COOKIE = 'sd_licence'
const YEAR = 60 * 60 * 24 * 365
const SITE_DOMAIN = 'escalatokens.com'

/** The `Domain` this host may set the key for, or '' for a host-only cookie
 *  (localhost, a `*.vercel.app` preview, a fork on its own domain). */
export function licenceCookieDomain(host: string | string[] | undefined): string {
  const raw = (Array.isArray(host) ? host[0] : host) ?? ''
  const name = raw.trim().toLowerCase().replace(/:\d+$/, '')
  return name === SITE_DOMAIN || name.endsWith(`.${SITE_DOMAIN}`) ? SITE_DOMAIN : ''
}

function cookie(key: string, secure: boolean, domain: string): string {
  const bits = [
    `${LICENCE_COOKIE}=${encodeURIComponent(key)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${key ? YEAR : 0}`,
  ]
  if (domain) bits.push(`Domain=${domain}`)
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

/** `Set-Cookie` values for this response. `key` empty clears the cookie.
 *  `secure` is on in production (`VERCEL_ENV`); localhost is http.
 *  On the site's own hosts this is two values, in this order: expire the
 *  host-only cookie, then write (or expire) the site-wide one. Browsers that
 *  count the two as one cookie end with the second value; browsers that keep
 *  them apart drop the old one. Either way one cookie is left. */
export function licenceCookieHeaders(
  key: string,
  opts: { secure?: boolean; host?: string | string[] } = {},
): string[] {
  const secure = opts.secure === true
  const domain = licenceCookieDomain(opts.host)
  if (!domain) return [cookie(key, secure, '')]
  return [cookie('', secure, ''), cookie(key, secure, domain)]
}

export function readLicenceCookie(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header.join('; ') : (header ?? '')
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== LICENCE_COOKIE) continue
    try {
      const value = decodeURIComponent(part.slice(eq + 1)).trim()
      // A cleared cookie can still ride along as an empty value next to the
      // live one while both scopes exist. Skip it and keep looking.
      if (value) return value
    } catch {
      continue
    }
  }
  return ''
}
