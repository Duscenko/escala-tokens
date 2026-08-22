import { createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, head, get } from '@vercel/blob'
import {
  claimBlobKey,
  originAllowed,
  originsForHosts,
  parseBearer,
  PROJECT_REQUIRED,
  tokenBlobKey,
} from '../src/lib/publishTrust'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function slugifyProject(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return slug || null
}

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

async function readClaim(project: string): Promise<ClaimRecord | null> {
  try {
    const result = await get(claimBlobKey(project), { access: 'private' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    const parsed = JSON.parse(text) as { hash?: unknown }
    return typeof parsed.hash === 'string' ? { hash: parsed.hash } : null
  } catch {
    return null
  }
}

async function writeClaim(project: string, hash: string): Promise<void> {
  await put(claimBlobKey(project), JSON.stringify({ hash } satisfies ClaimRecord), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
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

    try {
      const url = (await head(tokenBlobKey(project))).url
      if (!url) return res.status(404).json({ error: 'No tokens published yet.' })
      const raw = await fetch(url)
      const data = await raw.json()
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(data)
    } catch {
      return res.status(404).json({ error: 'No tokens published yet.' })
    }
  }

  // ── POST /api/tokens[?project=<id>] ──────────────────────────────────────────
  if (req.method === 'POST') {
    if (!originAllowed(req.headers.origin, requestOrigins(req))) {
      return res.status(403).json({ error: 'Publish only from this app.' })
    }

    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid body — expected JSON object.' })
    }
    if (!(body as Record<string, unknown>).colors) {
      return res.status(400).json({ error: 'Missing "colors" field in tokens.' })
    }
    if (!project) {
      return res.status(400).json({ error: PROJECT_REQUIRED })
    }

    const existing = await readClaim(project)
    const presented = parseBearer(req.headers.authorization)

    if (existing) {
      if (!presented || hashClaim(presented) !== existing.hash) {
        return res.status(401).json({
          error: 'This slug is claimed. Pass the publish claim from this browser or .escala/system.json.',
        })
      }
    }

    const key = tokenBlobKey(project)
    const json = JSON.stringify(body)
    await put(key, json, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      allowOverwrite: true,
    })

    let claim: string | undefined
    if (!existing) {
      claim = generateClaim()
      await writeClaim(project, hashClaim(claim))
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
