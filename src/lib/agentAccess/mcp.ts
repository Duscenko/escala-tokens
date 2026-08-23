import { callTool, TOOL_SPECS } from './callTool.js'
import type { LoadTokens } from './types.js'

export const MCP_SERVER_NAME = 'escala-tokens'
export const MCP_SERVER_VERSION = '1.0.0'
export const MCP_PROTOCOL_VERSIONS = ['2025-03-26', '2024-11-05'] as const

export interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

function isNotification(msg: JsonRpcRequest): boolean {
  return msg.id === undefined
}

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function fail(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } }
}

function pickProtocol(requested: unknown): string {
  if (typeof requested === 'string' && (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)) {
    return requested
  }
  return MCP_PROTOCOL_VERSIONS[0]
}

async function handleOne(msg: JsonRpcRequest, loadTokens: LoadTokens): Promise<JsonRpcResponse | null> {
  const id = msg.id ?? null
  const method = msg.method ?? ''

  if (isNotification(msg)) {
    return null
  }

  if (msg.jsonrpc !== '2.0') {
    return fail(id, -32600, 'Invalid Request: jsonrpc must be "2.0"')
  }

  switch (method) {
    case 'initialize': {
      const params = (msg.params ?? {}) as { protocolVersion?: string }
      return ok(id, {
        protocolVersion: pickProtocol(params.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        instructions:
          'Escala design tokens. Prefer resolve_token and the component catalogue over inventing names or hex. Semantic roles over primitives. /api/tokens stays the publish/fetch endpoint; this server only reads.',
      })
    }
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: TOOL_SPECS })
    case 'tools/call': {
      const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
      const name = params.name
      if (!name) return fail(id, -32602, 'tools/call requires params.name')
      try {
        const result = await callTool(name, params.arguments, loadTokens)
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return ok(id, {
          content: [{ type: 'text', text: message }],
          isError: true,
        })
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`)
  }
}

export async function handleMcpMessage(
  body: unknown,
  loadTokens: LoadTokens,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(body)) {
    const out: JsonRpcResponse[] = []
    for (const item of body) {
      const res = await handleOne((item ?? {}) as JsonRpcRequest, loadTokens)
      if (res) out.push(res)
    }
    return out.length ? out : null
  }
  if (!body || typeof body !== 'object') {
    return fail(null, -32600, 'Invalid Request')
  }
  return handleOne(body as JsonRpcRequest, loadTokens)
}

export function mcpDiscovery(origin = '') {
  const schema = `${origin}/docs/agent-native/tokens.schema.json`
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    protocol: 'mcp',
    transport: 'http-jsonrpc',
    endpoint: `${origin}/api/mcp`,
    tokensEndpoint: `${origin}/api/tokens?project=`,
    schema,
    tools: TOOL_SPECS.map((t) => t.name),
    instructions: 'POST JSON-RPC 2.0 (initialize, tools/list, tools/call). GET this URL for discovery. /api/tokens is frozen.',
  }
}
