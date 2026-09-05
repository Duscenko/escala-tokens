import { figmaPrimitiveName, figmaSemanticName, figmaSpacingName, webCodeSyntax, type PrimitiveNameContext } from '../agentBundle/names.js'
import type { ThemeSlot, TokenJSON } from '../agentBundle/types.js'

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

/** Everything `figmaPrimitiveName` needs to match what the plugin writes. */
function nameContext(json: TokenJSON): PrimitiveNameContext {
  return {
    themeSources: json.colors.themeSources,
    themeOrder: json.colors.themeOrder,
    themeLabels: json.colors.themeLabels,
  }
}

/** The vocabulary the skill and the tool descriptions teach. */
const CANONICAL_SLOT: Record<string, ThemeSlot> = {
  accent: 'brand',
  brand: 'brand',
  neutral: 'gray',
  gray: 'gray',
  error: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
}

/**
 * `accent-9` on a system whose brand ramp is a THEME-MINTED family.
 *
 * `+ Theme` / adopting a System Style mints `customColors` named after the
 * theme, so a real published payload keys its ramps `material--elevation-9`,
 * not `accent-9` — there is no `accent` family anywhere in it. Measured against
 * a live system: every primitive name the skill teaches (`accent-9`,
 * `neutral-1`, `error-9`, `Accent/09`, …) resolved `unknown`, which reads to an
 * agent as "you invented that token" for a ramp the system genuinely ships.
 *
 * The payload already carries the mapping in `colors.themeSources`; this just
 * uses it. Themes are tried activeTheme-first so a single-theme system — the
 * common case — is unambiguous, and the resolved `id` comes back as the REAL
 * key so the agent learns the system's own name for it.
 */
function themeAliasedKey(
  json: TokenJSON,
  query: string,
  bucket: 'primitive' | 'primitiveAlpha',
): string | null {
  const sources = json.colors.themeSources
  if (!sources) return null
  const m = /^([a-z]+)(-dark)?(-a)?-(\d+)$/.exec(query.trim().toLowerCase())
  if (!m) return null
  const [, family, dark, alpha, tone] = m
  // The alpha bucket names a family twin by the BARE family, so `-a` is part of
  // the QUERY grammar only — never part of the stored key.
  if (bucket === 'primitiveAlpha' ? !alpha : Boolean(alpha)) return null
  const slot = CANONICAL_SLOT[family ?? '']
  if (!slot) return null
  const map = json.colors[bucket] ?? {}
  const order = [json.colors.activeTheme, ...(json.colors.themeOrder ?? []), ...Object.keys(sources)]
  for (const theme of order) {
    const base = theme ? sources[theme]?.[slot] : undefined
    if (!base) continue
    const key = `${base}${dark ?? ''}-${tone}`
    if (map[key] != null) return key
  }
  return null
}

function primitiveValues(json: TokenJSON, raw: string, id: string): { key: string; hex: string } | null {
  const primitive = json.colors.primitive ?? {}
  if (primitive[id]) return { key: id, hex: primitive[id] }
  if (primitive[raw]) return { key: raw, hex: primitive[raw] }
  const ctx = nameContext(json)
  for (const [key, hex] of Object.entries(primitive)) {
    if (figmaPrimitiveName(key, ctx) === raw || figmaPrimitiveName(key, ctx) === id) {
      return { key, hex }
    }
  }
  for (const q of [id, raw]) {
    const aliased = themeAliasedKey(json, q, 'primitive')
    if (aliased) return { key: aliased, hex: primitive[aliased]! }
  }
  return alphaPrimitiveValues(json, raw, id)
}

/**
 * Alpha primitives, which live in their OWN payload bucket and were invisible
 * to this resolver — an agent asking for `accent-a-3` or `black-a-8` got
 * `unknown` for a token the system genuinely ships, which is the exact failure
 * `resolve_token` exists to prevent (see the "live over static" note in
 * CLAUDE.md: a stale answer here is worse than no answer).
 *
 * Two key shapes, both tried, because the bucket names a family twin by the
 * BARE family (`accent-3` — `primitiveAlpha` already disambiguates it from
 * `primitive`) while `black-a`/`white-a` carry the `-a` in the key itself.
 * The CSS name always carries the infix, matching what `buildCSS` emits.
 */
function alphaPrimitiveValues(json: TokenJSON, raw: string, id: string): { key: string; hex: string } | null {
  const alpha = json.colors.primitiveAlpha
  if (!alpha) return null
  for (const q of [id, raw]) {
    if (alpha[q]) return { key: q, hex: alpha[q] }
    // `accent-a-3` → the twin stored as `accent-3`; keeps the queried NAME so
    // the agent sees back the token it asked about, not an ambiguous one that
    // also names a solid.
    const m = /^(.+)-a-(\d+)$/.exec(q)
    if (m && alpha[`${m[1]}-${m[2]}`]) return { key: q, hex: alpha[`${m[1]}-${m[2]}`] }
    const aliased = themeAliasedKey(json, q, 'primitiveAlpha')
    if (aliased) return { key: aliased, hex: alpha[aliased]! }
  }
  return null
}

type FoundationThemeMaps = NonNullable<TokenJSON['foundationsByTheme']>[string]

function foundationValues(json: TokenJSON, id: string): ResolvedToken | null {
  const maps: {
    kind: string
    cssPrefix: string
    root: Record<string, string> | undefined
    themeField: keyof FoundationThemeMaps
    figma: (k: string) => string
  }[] = [
    { kind: 'radius', cssPrefix: 'radius', root: json.radius, themeField: 'radius', figma: (k) => k },
    { kind: 'spacing', cssPrefix: 'spacing', root: json.spacing, themeField: 'spacing', figma: figmaSpacingName },
    { kind: 'size', cssPrefix: 'size', root: json.sizes, themeField: 'sizes', figma: (k) => k },
    { kind: 'selector', cssPrefix: 'selector', root: json.selector, themeField: 'selector', figma: (k) => k },
    { kind: 'stroke', cssPrefix: 'stroke', root: json.stroke, themeField: 'stroke', figma: (k) => k },
    { kind: 'grid', cssPrefix: 'grid', root: json.grid, themeField: 'grid', figma: (k) => k },
    { kind: 'shadow', cssPrefix: 'shadow', root: json.shadows, themeField: 'shadows', figma: (k) => `${json.project || 'SD'}/Shadow/${k}` },
  ]
  const tail = id.includes('.') ? id.slice(id.indexOf('.') + 1) : id
  const head = id.includes('.') ? id.slice(0, id.indexOf('.')) : ''
  const byTheme = json.foundationsByTheme
  for (const map of maps) {
    if (head && head !== map.kind && head !== map.cssPrefix) continue
    const key = foundationKey(map.root, byTheme, map.themeField, id, tail)
    if (key == null) continue
    const values = foundationThemeValues(map.root, byTheme, json.colors.themeOrder, map.themeField, key)
    if (!values) continue
    return {
      query: id,
      id: `${map.kind}.${key}`,
      kind: 'foundation',
      figma: map.figma(key),
      css: `var(--${map.cssPrefix}-${key})`,
      values,
      found: true,
    }
  }
  return null
}

function foundationKey(
  root: Record<string, string> | undefined,
  byTheme: TokenJSON['foundationsByTheme'],
  field: keyof FoundationThemeMaps,
  id: string,
  tail: string,
): string | null {
  if (root?.[id] != null) return id
  if (root?.[tail] != null) return tail
  for (const theme of Object.values(byTheme ?? {})) {
    const map = theme[field]
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      const rec = map as Record<string, string>
      if (rec[id] != null) return id
      if (rec[tail] != null) return tail
    }
  }
  return null
}

/** Prefer per-theme maps when the payload ships `foundationsByTheme` — root
 *  is the plugin fallback and can disagree (Hola Material lg 16 vs root 32). */
function foundationThemeValues(
  root: Record<string, string> | undefined,
  byTheme: TokenJSON['foundationsByTheme'],
  themeOrder: string[] | undefined,
  field: keyof FoundationThemeMaps,
  key: string,
): Record<string, string> | null {
  const fallback = root?.[key]
  const themes = themeOrder?.length ? themeOrder : Object.keys(byTheme ?? {})
  if (byTheme && themes.length) {
    const out: Record<string, string> = {}
    for (const theme of themes) {
      const map = byTheme[theme]?.[field]
      const themed = map && typeof map === 'object' && !Array.isArray(map)
        ? (map as Record<string, string>)[key]
        : undefined
      const value = themed ?? fallback
      if (value != null) out[theme] = value
    }
    if (Object.keys(out).length) return out
  }
  if (fallback == null) return null
  return { default: fallback }
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
      figma: figmaPrimitiveName(prim.key, nameContext(json)),
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
