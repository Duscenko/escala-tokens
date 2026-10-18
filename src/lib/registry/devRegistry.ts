/**
 * `vite dev` only: answers `/r/<name>.json` the way `api/registry.ts` does,
 * with no Blob. `?project=dev` serves the default system (built here exactly as
 * the app builds tokens.json); any other id reads production's public
 * `GET /api/tokens`, so a real published system can be installed locally.
 */
import type { TokenJSON } from '../agentBundle/types'
import { buildRegistryIndex, buildRegistryItem } from './shadcnRegistry'

export const DEV_PROJECT = 'dev'

async function devTokens(project: string): Promise<{ json?: TokenJSON; status: number; error?: string }> {
  if (project === DEV_PROJECT) {
    const { makeDesignDefaults, useDesignStore } = await import('../../store/useDesignStore')
    const { ensureColorScales } = await import('../colorActions')
    const { generateTokenJSON } = await import('../tokenGenerator')
    useDesignStore.setState(makeDesignDefaults())
    ensureColorScales()
    return { json: generateTokenJSON() as unknown as TokenJSON, status: 200 }
  }
  const res = await fetch(`https://escalatokens.com/api/tokens?project=${encodeURIComponent(project)}`)
  if (!res.ok) return { status: res.status, error: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? res.statusText }
  return { json: (await res.json()) as TokenJSON, status: 200 }
}

export async function devRegistryResponse(url: URL): Promise<{ status: number; body: unknown }> {
  const name = (/^\/r\/([a-z0-9-]+)\.json$/.exec(url.pathname)?.[1]) ?? ''
  const project = url.searchParams.get('project') ?? ''
  const brand = url.searchParams.get('brand')
  if (!project) return { status: 400, body: { error: 'Add ?project=<id> (or ?project=dev for the default system).' } }
  const opts = { origin: url.origin, project, brand }
  if (name === 'registry') return { status: 200, body: buildRegistryIndex(opts) }
  const { json, status, error } = await devTokens(project)
  if (!json) return { status, body: { error } }
  const item = buildRegistryItem(name, json, opts)
  return item ? { status: 200, body: item } : { status: 404, body: { error: `No registry item "${name}".` } }
}
