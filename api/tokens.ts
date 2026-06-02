import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, head, getDownloadUrl } from '@vercel/blob'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const BLOB_KEY = 'design-tokens.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end()
    return
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  // ── GET /api/tokens ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const blob = await head(BLOB_KEY)
      const raw = await fetch(blob.url)
      const data = await raw.json()
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(data)
    } catch {
      return res.status(404).json({ error: 'No tokens published yet.' })
    }
  }

  // ── POST /api/tokens ─────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid body — expected JSON object.' })
    }
    if (!(body as Record<string, unknown>).colors) {
      return res.status(400).json({ error: 'Missing "colors" field in tokens.' })
    }

    const json = JSON.stringify(body)
    await put(BLOB_KEY, json, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })

    return res.status(200).json({
      ok: true,
      project: (body as Record<string, unknown>).project ?? 'untitled',
      updatedAt: new Date().toISOString(),
    })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
