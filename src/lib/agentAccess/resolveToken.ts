import { figmaPrimitiveName, figmaSemanticName, figmaSpacingName, webCodeSyntax } from '../agentBundle/names.js'
import type { TokenJSON } from '../agentBundle/types.js'

export type ResolvedKind = 'semantic' | 'primitive' | 'foundation' | 'unknown'

export interface ResolvedToken {
  query: string
  id: string
  kind: ResolvedKind
  figma: string
  css: string
  values: Record<string, string>
  found: boolean
}

const GROUP_FROM_FIGMA: Record<string, string> = {
  Content: 'content',
  Action: 'action',
  Surface: 'surface',
  Status: 'status',
  Border: 'border',
}

/** `Action/primary/default` → `action.primary.default`. Dotted ids pass through. */
export function normalizeTokenId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.includes('/')) return trimmed
  const [head, ...rest] = trimmed.split('/')
  const group = GROUP_FROM_FIGMA[head ?? ''] ?? (head ?? '').toLowerCase()
  return rest.length ? `${group}.${rest.join('.')}` : group
}

function architectureValues(json: TokenJSON, id: string): Record<string, string> | null {
  const [group, ...rest] = id.split('.')
  if (!group || rest.length === 0) return null
  const key = rest.join('.')
  const byTheme = json.colors.architecture?.tokens?.[group]?.[key]
  if (!byTheme) return null
  return { ...byTheme }
}

function themeValues(json: TokenJSON, id: string): Record<string, string> | null {
  const themes = json.colors.themes
  if (!themes) return null
  const kebab = id.replace(/\./g, '-')
  const out: Record<string, string> = {}
  for (const [theme, roles] of Object.entries(themes)) {
    const hex = roles[id] ?? roles[kebab]
    if (hex) out[theme] = hex
  }
  return Object.keys(out).length ? out : null
}

function primitiveValues(json: TokenJSON, raw: string, id: string): { key: string; hex: string } | null {
  const primitive = json.colors.primitive ?? {}
  if (primitive[id]) return { key: id, hex: primitive[id] }
  if (primitive[raw]) return { key: raw, hex: primitive[raw] }
  for (const [key, hex] of Object.entries(primitive)) {
    if (figmaPrimitiveName(key) === raw || figmaPrimitiveName(key) === id) {
      return { key, hex }
    }
  }
  return null
}

function foundationValues(json: TokenJSON, id: string): ResolvedToken | null {
  const maps: { kind: string; cssPrefix: string; values: Record<string, string> | undefined; figma: (k: string) => string }[] = [
    { kind: 'radius', cssPrefix: 'radius', values: json.radius, figma: (k) => k },
    { kind: 'spacing', cssPrefix: 'spacing', values: json.spacing, figma: figmaSpacingName },
    { kind: 'size', cssPrefix: 'size', values: json.sizes, figma: (k) => k },
    { kind: 'grid', cssPrefix: 'grid', values: json.grid, figma: (k) => k },
    { kind: 'shadow', cssPrefix: 'shadow', values: json.shadows, figma: (k) => `${json.project || 'SD'}/Shadow/${k}` },
  ]
  const tail = id.includes('.') ? id.slice(id.indexOf('.') + 1) : id
  const head = id.includes('.') ? id.slice(0, id.indexOf('.')) : ''
  for (const map of maps) {
    if (head && head !== map.kind && head !== map.cssPrefix) continue
    const key = map.values?.[id] != null ? id : map.values?.[tail] != null ? tail : null
    if (key == null || !map.values) continue
    return {
      query: id,
      id: `${map.kind}.${key}`,
      kind: 'foundation',
      figma: map.figma(key),
      css: `var(--${map.cssPrefix}-${key})`,
      values: { default: map.values[key]! },
      found: true,
    }
  }
  return null
}

export function resolveToken(json: TokenJSON, raw: string): ResolvedToken {
  const id = normalizeTokenId(raw)
  const arch = architectureValues(json, id)
  if (arch) {
    return {
      query: raw,
      id,
      kind: 'semantic',
      figma: figmaSemanticName(id),
      css: webCodeSyntax(id),
      values: arch,
      found: true,
    }
  }
  const themed = themeValues(json, id)
  if (themed) {
    return {
      query: raw,
      id,
      kind: 'semantic',
      figma: figmaSemanticName(id),
      css: webCodeSyntax(id),
      values: themed,
      found: true,
    }
  }
  const prim = primitiveValues(json, raw.trim(), id)
  if (prim) {
    return {
      query: raw,
      id: prim.key,
      kind: 'primitive',
      figma: figmaPrimitiveName(prim.key),
      css: `var(--color-${prim.key})`,
      values: { default: prim.hex },
      found: true,
    }
  }
  const foundation = foundationValues(json, id)
  if (foundation) return { ...foundation, query: raw }
  return {
    query: raw,
    id,
    kind: 'unknown',
    figma: figmaSemanticName(id),
    css: webCodeSyntax(id),
    values: {},
    found: false,
  }
}
