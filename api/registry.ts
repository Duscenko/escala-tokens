import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PROJECT_REQUIRED, tokenBlobKey } from '../src/lib/publishTrust.js'
import { LICENCE_REQUIRED_MESSAGE, isServable, stripLicence } from '../src/lib/licenceGate.js'
import { DELETED_SYSTEM_MESSAGE, isDeletedSystem } from '../src/lib/deletedSystem.js'
import { buildRegistryIndex, buildRegistryItem } from '../src/lib/registry/shadcnRegistry.js'
import type { TokenJSON } from '../src/lib/agentBundle/types.js'
import { clientIp, rateLimited, readJsonBlob, slugifyProject } from './_blob.js'

// GET /r/<name>.json?project=<id>[&brand=<theme>]  (vercel.json rewrites to
// /api/registry?name=<name>). The shadcn CLI registry: one escala-ui component,
// the recipe rules that paint it and the published system's values. Same gates
// as GET /api/tokens — it reads the same Blob, so it must not be a way around
// the licence or a deleted system.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
}
const GET_LIMIT_PER_MIN = 60

const one = (q: unknown) => (Array.isArray(q) ? q[0] : q)

function originOf(req: VercelRequest): string {
  const host = String(one(req.headers['x-forwarded-host']) ?? req.headers.host ?? 'escalatokens.com')
  const proto = String(one(req.headers['x-forwarded-proto']) ?? (host.startsWith('localhost') ? 'http' : 'https'))
  return `${proto}://${host}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })

  const name = String(one(req.query?.name) ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  const project = slugifyProject(one(req.query?.project))
  const brand = String(one(req.query?.brand) ?? '').slice(0, 64) || null
  res.setHeader('Cache-Control', 'no-store')
  if (!project) return res.status(400).json({ error: PROJECT_REQUIRED })
  if (!name) return res.status(400).json({ error: 'Name an item: /r/<component>.json?project=<id>.' })
  const opts = { origin: originOf(req), project, brand }
  if (name === 'registry') return res.status(200).json(buildRegistryIndex(opts))

  if (rateLimited(clientIp(req.headers), GET_LIMIT_PER_MIN)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Too many requests.' })
  }
  const data = await readJsonBlob<unknown>(tokenBlobKey(project))
  if (data === null) return res.status(404).json({ error: 'No tokens published yet.' })
  if (isDeletedSystem(data)) return res.status(410).json({ error: DELETED_SYSTEM_MESSAGE, deleted: true })
  if (!isServable(data, new Date())) return res.status(402).json({ error: LICENCE_REQUIRED_MESSAGE })

  const item = buildRegistryItem(name, stripLicence(data) as TokenJSON, opts)
  if (!item) return res.status(404).json({ error: `No registry item "${name}". See /r/registry.json?project=${project}.` })
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  return res.status(200).json(item)
}
