import { checkContrast } from './contrast'
import { getComponent, listComponents } from './components'
import { resolveToken } from './resolveToken'
import { TOOL_SPECS, type LoadTokens } from './types'
import type { TokenJSON } from '../agentBundle'

export { TOOL_SPECS }

async function requireTokens(loadTokens: LoadTokens, project?: unknown): Promise<TokenJSON> {
  const slug = typeof project === 'string' && project.trim() ? project.trim() : null
  const json = await loadTokens(slug)
  if (!json) {
    throw new Error(slug
      ? `No tokens published for project "${slug}". Publish from the configurator or call get_tokens without a project for the latest set.`
      : 'No tokens published yet.')
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
        throw new Error(`Unknown token "${resolved.query}". Use a catalogue id (action.primary.default) or Figma name (Action/primary/default). Do not invent a new role.`)
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
