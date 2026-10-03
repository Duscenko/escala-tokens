import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleMcpMessage, mcpDiscovery } from '../src/lib/agentAccess/mcp.js'
import type { TokenJSON } from '../src/lib/agentBundle/types.js'
import { tokenBlobKey } from '../src/lib/publishTrust.js'
import { isServable, stripLicence } from '../src/lib/licenceGate.js'
import { clientIp, rateLimited, readJsonBlob, slugifyProject } from './_blob.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id',
}

/** JSON-RPC batch cap — an unbounded array is one request doing N tool calls. */
const MAX_BATCH = 20
/** Per-instance soft limit; the Vercel Firewall rule is the real one. */
const RATE_LIMIT_PER_MIN = 120

async function loadTokens(project?: string | null): Promise<TokenJSON | null> {
  const slug = slugifyProject(project)
  if (!slug) return null
  const data = await readJsonBlob<TokenJSON>(tokenBlobKey(slug))
  // Live MCP is an Escala Pro feature once the launch promo is over: an
  // unlicensed system reads as "not published", the same answer an agent
  // already handles. See lib/licenceGate.ts.
  if (!data || !isServable(data, new Date())) return null
  return stripLicence(data)
}

/** One structured line per tool call → Vercel Logs (searchable `"evt":"mcp"`).
 *  Tool name only: never the project, the arguments, or the caller's IP —
 *  this is usage counting, not a profile of anyone. */
function logUsage(body: unknown) {
  const calls = Array.isArray(body) ? body : [body]
  for (const c of calls) {
    const msg = c as { method?: unknown; params?: { name?: unknown } } | null
    if (msg?.method !== 'tools/call') continue
    const tool = typeof msg.params?.name === 'string' ? msg.params.name.slice(0, 40) : 'unknown'
    console.info(JSON.stringify({ evt: 'mcp', tool }))
  }
}

function applyCors(res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end()
    return
  }

  applyCors(res)

  if (req.method === 'HEAD') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    // Streamable-HTTP clients (Claude Code, Cursor, VS Code) GET this URL with
    // `Accept: text/event-stream` to open a server→client stream. The spec
    // requires an SSE stream or 405. Answering 200 JSON made clients treat the
    // stream as dropped and reconnect in a loop — ~1 req/s per open client,
    // which is what blew through the Hobby quota. 405 tells them "no stream,
    // stop asking".
    const accept = String(req.headers.accept ?? '')
    res.setHeader('Vary', 'Accept')
    if (accept.includes('text/event-stream')) {
      res.setHeader('Allow', 'POST, OPTIONS')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(405).end()
    }
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
    const host = req.headers.host || 'escalatokens.com'
    // NOT CDN-cached on purpose: if the edge ignored `Vary: Accept` it would
    // hand this 200 to an SSE client and restart the reconnect loop.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(mcpDiscovery(`${proto}://${host}`))
  }

  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'DELETE') {
    // Session teardown from clients; this server is stateless.
    return res.status(405).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. POST JSON-RPC 2.0, or GET for discovery.' })
  }

  if (rateLimited(clientIp(req.headers), RATE_LIMIT_PER_MIN)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Too many requests.' })
  }

  const body = req.body
  if (Array.isArray(body) && body.length > MAX_BATCH) {
    return res.status(413).json({ error: `Batch too large (max ${MAX_BATCH}).` })
  }

  logUsage(body)
  const result = await handleMcpMessage(body, loadTokens)
  if (result === null) {
    res.status(202).end()
    return
  }
  return res.status(200).json(result)
}
