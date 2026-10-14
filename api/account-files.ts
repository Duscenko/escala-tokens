import { createHmac } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { BlobPreconditionFailedError, get, put } from '@vercel/blob'
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
// One blob per account, written with the etag the browser last read
// (`ifMatch`). A browser holding an older copy gets 409 and the current
// record, and must decide — it can never overwrite work saved elsewhere.
//
// The key is an HMAC of the user id, because the store is public: without the
// secret nobody can name another account's file. `ACCOUNT_FILES_SECRET` must
// never change once set — a new secret names new, empty files.
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

function filesKey(userId: string, secret: string): string {
  return `account-files/${createHmac('sha256', secret).update(userId).digest('hex')}.json`
}

async function readRecord(key: string): Promise<{ etag: string; record: CloudRecord } | null> {
  const found = await get(key, { access: 'public', useCache: false })
  if (!found || found.statusCode !== 200) return null
  const parsed: unknown = JSON.parse(await new Response(found.stream).text())
  if (!isCloudRecord(parsed)) throw new Error('corrupt')
  return { etag: found.blob.etag, record: parsed }
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

  const secret = process.env.ACCOUNT_FILES_SECRET?.trim()
  if (!secret) return res.status(503).json({ error: 'unconfigured' })

  const jwt = parseBearer(req.headers.authorization)
  if (!jwt) return res.status(401).json({ error: 'signed_out' })
  const user = await userFromJwt(jwt)
  if (user === 'unconfigured') return res.status(503).json({ error: 'unconfigured' })
  if (!user) return res.status(401).json({ error: 'signed_out' })

  if (rateLimited(`account-files:${user.id}`, PER_MINUTE)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const key = filesKey(user.id, secret)
  let current: { etag: string; record: CloudRecord } | null
  try {
    current = await readRecord(key)
  } catch {
    return res.status(502).json({ error: 'unavailable' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({ etag: current?.etag ?? null, record: current?.record ?? null })
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
  // Someone saved since this browser last read, or a newer app version wrote
  // a shape this browser would only half understand.
  if ((current?.etag ?? null) !== ifEtag) {
    return res.status(409).json({ error: 'stale', etag: current?.etag ?? null, record: current?.record ?? null })
  }
  if (current && current.record.storeVersion > storeVersion) {
    return res.status(409).json({ error: 'outdated', etag: current.etag, record: current.record })
  }

  let pro = true
  try {
    pro = await proForPlan(user)
  } catch {
    pro = true
  }
  const { files, trimmedIds } = trimToPlan(body.files, cloudSystemLimit(pro))
  const record: CloudRecord = {
    v: 1,
    revision: (current?.record.revision ?? 0) + 1,
    savedAt: new Date().toISOString(),
    storeVersion,
    files,
    trimmedIds: nextTrimmedIds(current?.record.trimmedIds ?? [], trimmedIds, files),
  }

  try {
    const written = await put(key, JSON.stringify(record), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
      ...(current ? { ifMatch: current.etag } : { allowOverwrite: false }),
    })
    console.info(JSON.stringify({
      evt: 'account_files',
      op: 'save',
      revision: record.revision,
      systems: files.savedSystems.length,
      trimmed: trimmedIds.length,
      pro,
    }))
    return res.status(200).json({ etag: written.etag, record })
  } catch (err) {
    // Another save landed between our read and our write.
    const raced = err instanceof BlobPreconditionFailedError ||
      (err instanceof Error && /already exists|precondition/i.test(err.message))
    if (raced) {
      try {
        const now = await readRecord(key)
        return res.status(409).json({ error: 'stale', etag: now?.etag ?? null, record: now?.record ?? null })
      } catch {
        return res.status(502).json({ error: 'unavailable' })
      }
    }
    return res.status(502).json({ error: 'unavailable' })
  }
}
