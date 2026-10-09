import { createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import {
  claimBlobKey,
  originAllowed,
  originsForHosts,
  parseBearer,
  PROJECT_REQUIRED,
  tokenBlobKey,
} from '../src/lib/publishTrust.js'
import { entitlementAt } from '../src/lib/entitlement.js'
import { LICENCE_REQUIRED_MESSAGE, isServable, stampLicence, stripLicence } from '../src/lib/licenceGate.js'
import { clientIp, forgetBlob, learnBlobBase, rateLimited, readJsonBlob, slugifyProject } from './_blob.js'
import { checkLicenceKey, licenceKeyHash } from './_licence.js'

// Vercel compiles this to ESM (`package.json` "type": "module"). Node then
// loads `/var/task/api/tokens.js` and requires a `.js` specifier for every
// relative import — extensionless paths throw ERR_MODULE_NOT_FOUND (HTTP 500
// for the Figma plugin). `api/tsconfig.json` stops the same graph failing
// TS2835 at compile time (root tsconfig is solution-style, no compilerOptions).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-escala-license',
}

/** A full system serialises to a few hundred KB; anything far past that is
 *  not a token payload. */
const MAX_BODY_BYTES = 2 * 1024 * 1024
/** Plugin live sync polls at most every 10s (6/min); leave room for "Update now". */
const GET_LIMIT_PER_MIN = 60
// Auto-sync republishes ~1.5s after edits stop, so bursts are real.
const POST_LIMIT_PER_MIN = 60

function readProject(req: VercelRequest): string | null {
  const q = req.query?.project
  return slugifyProject(Array.isArray(q) ? q[0] : q)
}

function hashClaim(claim: string): string {
  return createHash('sha256').update(claim).digest('hex')
}

function generateClaim(): string {
  return randomBytes(24).toString('base64url')
}

function logLicence(key: string, project: string, valid: boolean, reason: string | null) {
  console.info(JSON.stringify({
    evt: 'license',
    op: 'publish',
    keyHash: licenceKeyHash(key),
    project,
    valid,
    reason,
  }))
}

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

type ClaimRecord = { hash: string }

/** THROWS when the claim can't be read. It used to return `null` on any
 *  error, and `null` means "unclaimed" — so a Blob outage (or an exhausted
 *  quota) let anyone overwrite any system and take its slug. */
async function readClaim(project: string): Promise<ClaimRecord | null> {
  const parsed = await readJsonBlob<{ hash?: unknown }>(claimBlobKey(project), { fresh: true })
  return parsed && typeof parsed.hash === 'string' ? { hash: parsed.hash } : null
}

async function writeClaim(project: string, hash: string): Promise<void> {
  // Same public put as the token payload. The stored value is a SHA-256 hash,
  // not the claim itself — private Blob access was crashing this store and
  // turning a successful publish into HTTP 500 (plugin + Figma sync UI).
  const key = claimBlobKey(project)
  const out = await put(key, JSON.stringify({ hash } satisfies ClaimRecord), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  learnBlobBase(out.url, key)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end()
    return
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  const project = readProject(req)

  // ── GET /api/tokens[?project=<id>] ───────────────────────────────────────────
  if (req.method === 'GET') {
    // Listing used to return every slug. Nothing in the app or plugin reads it,
    // and it turned "guess the slug" into "here is the directory". Keep the
    // query param (frozen) but do not enumerate.
    if (req.query?.list !== undefined) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ systems: [], listing: false })
    }

    if (!project) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(400).json({ error: PROJECT_REQUIRED })
    }

    if (rateLimited(clientIp(req.headers), GET_LIMIT_PER_MIN)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }

    const data = await readJsonBlob<unknown>(tokenBlobKey(project))
    if (data === null) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).json({ error: 'No tokens published yet.' })
    }
    // Hosted sync is Pro once the launch promo is over (design-plans/
    // pricing-and-packaging.md). The answer rides inside the blob we just read
    // — see lib/licenceGate.ts — so this costs no extra fetch. Never cached:
    // a refusal must not outlive the licence that would lift it.
    if (!isServable(data, new Date())) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(402).json({ error: LICENCE_REQUIRED_MESSAGE })
    }
    res.setHeader('Content-Type', 'application/json')
    // Short edge cache: many plugins polling one system collapse into one
    // function run per window. 10s is the plugin's fastest interval, so a
    // fresh publish is never staler than one poll.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30')
    return res.status(200).json(stripLicence(data))
  }

  // ── POST /api/tokens[?project=<id>] ──────────────────────────────────────────
  if (req.method === 'POST') {
    if (!originAllowed(req.headers.origin, requestOrigins(req))) {
      return res.status(403).json({ error: 'Publish only from this app.' })
    }

    if (rateLimited(clientIp(req.headers), POST_LIMIT_PER_MIN)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Invalid body — expected JSON object.' })
    }
    if (!(body as Record<string, unknown>).colors) {
      return res.status(400).json({ error: 'Missing "colors" field in tokens.' })
    }
    if (!project) {
      return res.status(400).json({ error: PROJECT_REQUIRED })
    }

    // Publishing needs a licence once the promo is over. Checked BEFORE any
    // Blob read or write, so a refused request costs a Polar lookup at most.
    let licenceUntil: string | null | undefined
    if (!entitlementAt(new Date()).promo) {
      const raw = req.headers['x-escala-license']
      const licenceKey = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
      if (!licenceKey || licenceKey.length > 200) {
        return res.status(402).json({ error: LICENCE_REQUIRED_MESSAGE })
      }
      const licence = await checkLicenceKey(licenceKey)
      if (licence.reason === 'unavailable') {
        logLicence(licenceKey, project, false, 'unavailable')
        // Polar is down: that is not the customer's fault, so say "retry", not "pay".
        res.setHeader('Retry-After', '30')
        return res.status(503).json({ error: 'Could not verify the licence. Try again shortly.' })
      }
      if (!licence.valid) {
        logLicence(licenceKey, project, false, licence.reason ?? 'invalid')
        return res.status(402).json({
          error: licence.reason === 'expired'
            ? 'Your Escala Pro licence has expired. Renew it at escalatokens.com/pricing, or import tokens.json in the plugin by hand.'
            : LICENCE_REQUIRED_MESSAGE,
        })
      }
      logLicence(licenceKey, project, true, null)
      licenceUntil = licence.expiresAt
    }

    const key = tokenBlobKey(project)
    // The stamp is OURS to write. A client that sends its own `escalaLicence`
    // (say, during the free promo) would otherwise be stored as "licensed
    // forever" and stay readable after the promo — so any incoming one is
    // dropped before ours, if any, is added.
    const clean = stripLicence(body as object)
    const json = JSON.stringify(licenceUntil === undefined ? clean : stampLicence(clean, licenceUntil))
    if (json.length > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Payload too large.' })
    }

    let existing: ClaimRecord | null
    try {
      existing = await readClaim(project)
    } catch {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ error: 'Could not verify the publish claim. Try again shortly.' })
    }
    const presented = parseBearer(req.headers.authorization)

    if (existing) {
      if (!presented || hashClaim(presented) !== existing.hash) {
        return res.status(401).json({
          error: 'This slug is claimed. Pass the publish claim from this browser or .escala/system.json.',
        })
      }
    }

    let stored
    try {
      stored = await put(key, json, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        allowOverwrite: true,
      })
    } catch {
      return res.status(503).json({ error: 'Storage unavailable. Try again shortly.' })
    }
    learnBlobBase(stored.url, key)
    forgetBlob(key)

    let claim: string | undefined
    if (!existing) {
      claim = generateClaim()
      try {
        await writeClaim(project, hashClaim(claim))
      } catch {
        // Token payload is already public. Keep this request a 200 so the
        // configurator and plugin stay connected even if the claim write fails.
      }
    }

    return res.status(200).json({
      ok: true,
      project,
      key,
      claimed: true,
      ...(claim ? { claim } : {}),
      updatedAt: new Date().toISOString(),
    })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
