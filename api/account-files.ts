import { createHmac } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  cloudSystemLimit,
  isCloudFiles,
  isCloudRecord,
  MAX_CLOUD_BYTES,
  nextTrimmedIds,
  trimToPlan,
  type CloudRecord,
} from '../src/lib/accountCloud.js'
import { entitlementAt } from '../src/lib/entitlement.js'
import { originAllowed, originsForHosts, parseBearer } from '../src/lib/publishTrust.js'
import { accountPro } from './_accountPlan.js'
import {
  accountFilesConfigured, readFiles, readMeta, writeFiles, type StoredFiles, type StoredMeta,
} from './_accountFilesStore.js'
import { userFromJwt } from './_authUser.js'
import { rateLimited } from './_blob.js'

// GET  → the signed-in account's files: { etag, record } (record null = none yet).
// PUT  { ifEtag, storeVersion, files } → { etag, record } | 409 { etag, record }.
//
// "My files" in the cloud: the design system on screen, its saved systems,
// pins and Figma sync choices, so an account reads the same work in every
// browser and on both hosts. Before this, all of it lived in one origin's
// localStorage (`sd-account-files:*` parked it there on sign-out).
//
// One Supabase row per account (`_accountFilesStore.ts`), written only if it
// still holds the etag the browser last read. A browser holding an older copy
// gets 409 and the current record, and must decide — it can never overwrite
// work saved elsewhere.
//
// Until 2026-10-23 the files were one Vercel Blob per account, and the Hobby
// store got suspended for quota: every read answered 502 and nobody's work
// reached their account. An account with no row yet imports its old blob once,
// when the store lets us read it (`legacyRecord`).
//
// The plan decides how many design systems are kept (Free 1, Pro 10). A plan
// that cannot be read keeps the Pro limit: uncertainty never deletes work.

const PER_MINUTE = 30

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

/** The old blob's public URL: an HMAC of the user id under the store's base,
 *  because that store is public. `ACCOUNT_FILES_SECRET` named those files. */
function legacyUrl(userId: string): string | null {
  const secret = process.env.ACCOUNT_FILES_SECRET?.trim()
  const storeId = process.env.BLOB_STORE_ID?.trim()
  const base = process.env.BLOB_PUBLIC_BASE_URL?.trim() ||
    (storeId ? `https://${storeId.replace(/^store_/, '').toLowerCase()}.public.blob.vercel-storage.com` : '')
  if (!secret || !base) return null
  return `${base.replace(/\/$/, '')}/account-files/${createHmac('sha256', secret).update(userId).digest('hex')}.json`
}

/** The account's record from the Blob era, or null. Best effort: a suspended
 *  store answers 403 to everything, and then the account starts from what its
 *  browser holds. */
async function legacyRecord(userId: string): Promise<CloudRecord | null> {
  const url = legacyUrl(userId)
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) {
      if (res.status !== 404) console.warn(`account_files legacy_read status=${res.status}`)
      return null
    }
    const parsed: unknown = await res.json()
    return isCloudRecord(parsed) ? parsed : null
  } catch (err) {
    console.warn(`account_files legacy_read error=${JSON.stringify(err instanceof Error ? err.message : String(err))}`)
    return null
  }
}

/** An account with no row yet: its Blob-era record, copied into the table. */
async function importLegacy(userId: string): Promise<StoredFiles | null> {
  const legacy = await legacyRecord(userId)
  if (!legacy) return null
  const etag = await writeFiles(userId, null, legacy)
  if (etag === 'stale') return readFiles(userId)
  console.info(JSON.stringify({ evt: 'account_files', op: 'import_legacy', revision: legacy.revision }))
  return { etag, record: legacy }
}

async function currentFiles(userId: string): Promise<StoredFiles | null> {
  return (await readFiles(userId)) ?? importLegacy(userId)
}

/** What a save checks. The full record is only fetched when there is no row
 *  (the import) or when the save is refused and the browser needs it. */
async function currentMeta(userId: string): Promise<StoredMeta | null> {
  const meta = await readMeta(userId)
  if (meta) return meta
  const imported = await importLegacy(userId)
  if (!imported) return null
  const { revision, storeVersion, trimmedIds } = imported.record
  return { etag: imported.etag, revision, storeVersion, trimmedIds }
}

function storeFailed(res: VercelResponse, op: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`account_files ${op}_failed message=${JSON.stringify(message)}`)
  return res.status(502).json({ error: 'unavailable' })
}

async function proForPlan(user: { id: string; email: string }): Promise<boolean> {
  if (entitlementAt(new Date()).promo) return true
  const plan = await accountPro(user)
  return plan !== null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // A cross-site page must not read or write anyone's files, even with a token.
  const origin = req.headers.origin
  if (req.method === 'PUT' ? !originAllowed(origin, requestOrigins(req)) : origin && !originAllowed(origin, requestOrigins(req))) {
    return res.status(403).json({ error: 'forbidden' })
  }

  if (!accountFilesConfigured()) return res.status(503).json({ error: 'unconfigured' })

  const jwt = parseBearer(req.headers.authorization)
  if (!jwt) return res.status(401).json({ error: 'signed_out' })
  const user = await userFromJwt(jwt)
  if (user === 'unconfigured') return res.status(503).json({ error: 'unconfigured' })
  if (!user) return res.status(401).json({ error: 'signed_out' })

  if (rateLimited(`account-files:${user.id}`, PER_MINUTE)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'rate_limited' })
  }

  if (req.method === 'GET') {
    try {
      // A browser re-reading on focus names the etag it holds; most of the
      // time nothing changed, and the answer is a few bytes, not the files.
      const ifNoneMatch = req.headers['if-none-match']
      if (typeof ifNoneMatch === 'string' && ifNoneMatch) {
        const meta = await readMeta(user.id)
        if (meta && meta.etag === ifNoneMatch) return res.status(304).end()
      }
      const current = await currentFiles(user.id)
      return res.status(200).json({ etag: current?.etag ?? null, record: current?.record ?? null })
    } catch (err) {
      return storeFailed(res, 'read', err)
    }
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const ifEtag = typeof body.ifEtag === 'string' ? body.ifEtag : null
  const storeVersion = typeof body.storeVersion === 'number' ? body.storeVersion : NaN
  if (!Number.isFinite(storeVersion) || !isCloudFiles(body.files)) {
    return res.status(400).json({ error: 'invalid_files' })
  }
  if (JSON.stringify(body.files).length > MAX_CLOUD_BYTES) {
    return res.status(413).json({ error: 'too_large' })
  }

  let current: StoredMeta | null
  try {
    current = await currentMeta(user.id)
    // Someone saved since this browser last read, or a newer app version wrote
    // a shape this browser would only half understand.
    const error = (current?.etag ?? null) !== ifEtag ? 'stale' : current && current.storeVersion > storeVersion ? 'outdated' : null
    if (error) {
      const now = await readFiles(user.id)
      return res.status(409).json({ error, etag: now?.etag ?? null, record: now?.record ?? null })
    }
  } catch (err) {
    return storeFailed(res, 'read', err)
  }

  let pro: boolean
  try {
    pro = await proForPlan(user)
  } catch {
    pro = true
  }
  const { files, trimmedIds } = trimToPlan(body.files, cloudSystemLimit(pro))
  const record: CloudRecord = {
    v: 1,
    revision: (current?.revision ?? 0) + 1,
    savedAt: new Date().toISOString(),
    storeVersion,
    files,
    trimmedIds: nextTrimmedIds(current?.trimmedIds ?? [], trimmedIds, files),
  }

  try {
    const etag = await writeFiles(user.id, current?.etag ?? null, record)
    if (etag === 'stale') {
      // Another save landed between our read and our write.
      const now = await readFiles(user.id)
      return res.status(409).json({ error: 'stale', etag: now?.etag ?? null, record: now?.record ?? null })
    }
    console.info(JSON.stringify({
      evt: 'account_files',
      op: 'save',
      revision: record.revision,
      systems: files.savedSystems.length,
      trimmed: trimmedIds.length,
      pro,
    }))
    return res.status(200).json({ etag, record })
  } catch (err) {
    return storeFailed(res, 'write', err)
  }
}
