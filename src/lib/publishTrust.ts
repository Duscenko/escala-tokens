/**
 * Publish-endpoint trust helpers — DOM-free, no Node crypto.
 *
 * Git is the durable save (see `escalaSystem.ts`). `/api/tokens` is a live-sync
 * cache for Figma/MCP. GET stays unauthenticated. POST is same-origin and,
 * once a slug has been claimed, bearer-gated. `?list=1` no longer enumerates.
 */

export const TOKENS_PREFIX = 'tokens/'
export const CLAIMS_PREFIX = 'claims/'
export const CLAIM_STORAGE_PREFIX = 'sd-publish-claim:'
export const PROJECT_REQUIRED =
  'Missing ?project=<slug>. Each design system publishes to its own URL — there is no global latest blob.'

const KNOWN_HOSTS = [
  'escalatokens.com',
  'www.escalatokens.com',
  'scalable-designs.vercel.app',
]

export function tokenBlobKey(project: string): string {
  return `${TOKENS_PREFIX}${project}.json`
}

export function claimBlobKey(project: string): string {
  return `${CLAIMS_PREFIX}${project}.json`
}

export function isTokenBlobPath(pathname: string): boolean {
  return pathname.startsWith(TOKENS_PREFIX) && pathname.endsWith('.json') && !pathname.slice(TOKENS_PREFIX.length).includes('/')
}

export function claimStorageKey(slug: string): string {
  return `${CLAIM_STORAGE_PREFIX}${slug}`
}

export function parseBearer(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header
  if (!raw) return null
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim())
  return match?.[1] ?? null
}

/** Strip a Host / forwarded-host / URL down to hostname[:port]. */
export function hostnameOf(value: string): string {
  const trimmed = value.trim().split(',')[0]!.trim()
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`)
    return url.host
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

export function originsForHosts(hosts: Array<string | undefined | null>): string[] {
  const origins = new Set<string>()
  for (const host of hosts) {
    if (!host) continue
    const name = hostnameOf(host)
    if (!name) continue
    origins.add(`https://${name}`)
    origins.add(`http://${name}`)
  }
  for (const known of KNOWN_HOSTS) {
    origins.add(`https://${known}`)
  }
  return [...origins]
}

/**
 * POST is accepted only from this deployment (or the known production hosts).
 * Missing Origin is rejected — curl cannot claim or overwrite a slug.
 */
export function originAllowed(
  origin: string | string[] | undefined,
  allowed: Iterable<string>,
): boolean {
  const raw = Array.isArray(origin) ? origin[0] : origin
  if (!raw) return false
  try {
    const normalised = new URL(raw).origin
    const set = new Set([...allowed].map((o) => new URL(o).origin))
    return set.has(normalised)
  } catch {
    return false
  }
}
