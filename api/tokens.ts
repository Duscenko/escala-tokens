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
import { clientIp, forgetBlob, learnBlobBase, rateLimited, readJsonBlob, slugifyProject } from './_blob.js'

// Vercel compiles this to ESM (`package.json` "type": "module"). Node then
// loads `/var/task/api/tokens.js` and requires a `.js` specifier for every
// relative import — extensionless paths throw ERR_MODULE_NOT_FOUND (HTTP 500
// for the Figma plugin). `api/tsconfig.json` stops the same graph failing
// TS2835 at compile time (root tsconfig is solution-style, no compilerOptions).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    res.setHeader('Content-Type', 'application/json')
    // Short edge cache: many plugins polling one system collapse into one
    // function run per window. 10s is the plugin's fastest interval, so a
    // fresh publish is never staler than one poll.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30')
    return res.status(200).json(data)
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

    const key = tokenBlobKey(project)
    const json = JSON.stringify(body)
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
