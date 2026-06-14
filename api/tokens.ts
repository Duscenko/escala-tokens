import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, head, list } from '@vercel/blob'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Legacy single-tenant key. Still written by POSTs without a `project`, and used
// as the bare GET fallback so plugins pinned to `/api/tokens` keep working.
const GLOBAL_KEY = 'design-tokens.json'
const PREFIX = 'tokens/'

// Sanitize a project param into a stable blob key segment. Mirrors the
// configurator's slugify so `?project=Apollo UI` and `apollo-ui` resolve alike.
function slugifyProject(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return slug || null
}

function readProject(req: VercelRequest): string | null {
  const q = req.query?.project
  return slugifyProject(Array.isArray(q) ? q[0] : q)
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
    // List published systems: GET /api/tokens?list=1
    if (req.query?.list !== undefined) {
      try {
        const { blobs } = await list({ prefix: PREFIX })
        const systems = blobs
          .map((b) => ({
            project: b.pathname.slice(PREFIX.length).replace(/\.json$/, ''),
            updatedAt: b.uploadedAt,
          }))
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json({ systems })
      } catch {
        return res.status(200).json({ systems: [] })
      }
    }

    try {
      const url = project
        ? (await head(`${PREFIX}${project}.json`)).url
        : await latestBlobUrl()
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
    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid body — expected JSON object.' })
    }
    if (!(body as Record<string, unknown>).colors) {
      return res.status(400).json({ error: 'Missing "colors" field in tokens.' })
    }

    const key = project ? `${PREFIX}${project}.json` : GLOBAL_KEY
    const json = JSON.stringify(body)
    await put(key, json, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })

    return res.status(200).json({
      ok: true,
      project: project ?? (body as Record<string, unknown>).project ?? 'untitled',
      key,
      updatedAt: new Date().toISOString(),
    })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}

// Bare GET fallback: the most recently published set across the global key and
// every scoped `tokens/*.json`, so a plugin on the plain `/api/tokens` URL still
// reads "whatever was published last".
async function latestBlobUrl(): Promise<string | null> {
  try {
    const { blobs } = await list()
    if (blobs.length === 0) return null
    const newest = blobs.reduce((a, b) => (a.uploadedAt >= b.uploadedAt ? a : b))
    return newest.url
  } catch {
    return null
  }
}
