import { checkContrast } from './contrast.js'
import { getComponent, listComponents } from './components.js'
import { resolveToken } from './resolveToken.js'
import { TOOL_SPECS, type LoadTokens } from './types.js'
import type { TokenJSON } from '../agentBundle/types.js'

export { TOOL_SPECS }

async function requireTokens(loadTokens: LoadTokens, project?: unknown): Promise<TokenJSON> {
  const slug = typeof project === 'string' && project.trim() ? project.trim() : null
  if (!slug) {
    throw new Error('project is required. Use the slug from /api/tokens?project=<slug>.')
  }
  const json = await loadTokens(slug)
  if (!json) {
    throw new Error(`No tokens published for project "${slug}". Publish from the configurator, then pass that slug.`)
  }
  return json
}

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing required argument: ${name}`)
  return value
}

export async function callTool(
  name: string,
  args: Record<string, unknown> | undefined,
  loadTokens: LoadTokens,
): Promise<unknown> {
  const a = args ?? {}
  switch (name) {
    case 'get_tokens':
      return requireTokens(loadTokens, a.project)
    case 'resolve_token': {
      const json = await requireTokens(loadTokens, a.project)
      const resolved = resolveToken(json, asString(a.token, 'token'))
      if (!resolved.found) {
        // "Do not invent a role" is the wrong advice when the token is real but
        // the PUBLISH is old — `selector.*`, `black-a-*` and `white-a-*` simply
        // do not exist in a schema-6 payload, and an agent told it hallucinated
        // will work around a token the system actually ships. Name the version
        // so the agent can tell the two apart and ask for a re-publish.
        const v = json.schemaVersion
        throw new Error(
          `Unknown token "${resolved.query}" in project "${String(a.project)}"` +
            (v ? ` (published schemaVersion ${v})` : '') +
            '. Use a catalogue id (action.primary.default) or Figma name (Action/primary/default). ' +
            'Do not invent a role — but if you expected this token, the published system may predate it: re-publish from the configurator (Sync now) and retry.',
        )
      }
      return resolved
    }
    case 'list_components':
      return listComponents(typeof a.category === 'string' ? a.category : undefined)
    case 'get_component': {
      const def = getComponent(asString(a.key, 'key'))
      if (!def) throw new Error(`Unknown component "${String(a.key)}". Call list_components for valid keys.`)
      return def
    }
    case 'list_icons': {
      const json = await requireTokens(loadTokens, a.project)
      return {
        aiSource: json.icons?.aiSource ?? null,
        custom: (json.icons?.custom ?? []).map((c) => c.name).filter((n): n is string => Boolean(n)),
      }
    }
    case 'check_contrast':
      return checkContrast(
        asString(a.foreground, 'foreground'),
        asString(a.background, 'background'),
        typeof a.intent === 'string' ? a.intent : undefined,
      )
    default:
      throw new Error(`Unknown tool "${name}". Available: ${TOOL_SPECS.map((t) => t.name).join(', ')}.`)
  }
}
