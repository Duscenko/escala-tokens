import { BlobNotFoundError, head } from '@vercel/blob'

// Shared read path for the published token Blobs. The leading underscore keeps
// Vercel from deploying this file as its own function.
//
// Why it exists: every read used to call `head()` first to learn the blob's
// URL. `head` is a Blob ADVANCED operation (Hobby: 2,000/month), and the MCP
// endpoint ran it on every tool call — that is what exhausted the quota and
// then turned publishes into HTTP 500s. Blobs are written with
// `addRandomSuffix: false`, so a blob's URL is always `<store base><key>`:
// learn the base ONCE per instance (or from BLOB_PUBLIC_BASE_URL) and fetch
// the public URL directly, which is a cheap cached read.

const TTL_MS = 15_000
const MISS_TTL_MS = 10_000
const MAX_ENTRIES = 500

let storeBase: string | null = normaliseBase(process.env.BLOB_PUBLIC_BASE_URL)

const cache = new Map<string, { at: number; ttl: number; data: unknown }>()

function normaliseBase(raw: string | undefined): string | null {
  if (!raw) return null
  return raw.endsWith('/') ? raw : `${raw}/`
}

/** Record the store base from any URL Blob hands back for `key`. */
export function learnBlobBase(url: string | undefined, key: string): void {
  if (!url || storeBase) return
  if (url.endsWith(key)) storeBase = url.slice(0, url.length - key.length)
}

export function forgetBlob(key: string): void {
  cache.delete(key)
}

async function fetchJson(url: string): Promise<unknown | null> {
  const raw = await fetch(url)
  if (raw.status === 404) return null
  if (!raw.ok) throw new Error(`blob ${raw.status}`)
  return raw.json()
}

/** Read a public JSON blob, `null` when it does not exist. In-memory cached
 *  per instance (Fluid reuses instances), misses cached briefly too so a
 *  bot hammering unknown slugs never reaches Blob more than once per window. */
export async function readJsonBlob<T>(
  key: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<T | null> {
  const now = Date.now()
  const hit = fresh ? undefined : cache.get(key)
  if (hit && now - hit.at < hit.ttl) return hit.data as T | null

  let data: unknown | null
  try {
    if (storeBase) {
      data = await fetchJson(`${storeBase}${key}`)
    } else {
      let url: string | undefined
      try {
        url = (await head(key)).url
      } catch (err) {
        if (!(err instanceof BlobNotFoundError)) throw err
      }
      learnBlobBase(url, key)
      data = url ? await fetchJson(url) : null
    }
  } catch (err) {
    // A fresh read backs an auth decision, where "couldn't read" must never be
    // mistaken for "doesn't exist" — fail closed and let the caller refuse.
    if (fresh) throw err
    data = null
  }

  // A fresh read never populates the cache either.
  if (fresh) return data as T | null
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: now, ttl: data === null ? MISS_TTL_MS : TTL_MS, data })
  return data as T | null
}

// ── Per-instance rate limit ─────────────────────────────────────────────────
// A soft first line only: each Fluid instance counts on its own, so the real
// limit is the Vercel Firewall rule (blocks before the function runs). This
// still stops one client looping against a warm instance.

const buckets = new Map<string, { start: number; count: number }>()

export function rateLimited(ip: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now - b.start > windowMs) {
    if (buckets.size > 5_000) buckets.clear()
    buckets.set(ip, { start: now, count: 1 })
    return false
  }
  b.count += 1
  return b.count > limit
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-real-ip'] ?? headers['x-forwarded-for']
  const first = Array.isArray(raw) ? raw[0] : raw
  return (first ?? 'unknown').split(',')[0].trim()
}

/** Slugs are capped so a query param can't become an unbounded Blob key. */
export function slugifyProject(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64)
  return slug || null
}
