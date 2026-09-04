// One search index for every variable in the system, and one ranking for it.
//
// WHY THIS EXISTS. The workspace has a single "Search tokens" field, and it
// used to be threaded straight into whichever table happened to be mounted —
// six different in-place filters, each with its own predicate. Measured, that
// meant a query could only ever see the open collection of the open
// foundation, and the DEFAULT architecture's filter read token NAMES only. So
// `button` — a word that appears 55 times across the four role catalogues
// (`radius.action` "Buttons, inputs, selects, OTP, tabs", `size.control`
// "Default button, input, select height", `type.button`, `stroke.control`,
// `action.primary.default`) — returned "No tokens match".
//
// VALUES COME FROM THE EXPORT, PROSE COMES FROM THE CATALOGUES. The whole
// index is built from ONE `generateTokenJSON()` payload plus the same four
// static catalogues `tokenDescriptions.ts` already reads for Figma variable
// descriptions. That is deliberate and load-bearing: a result row cannot claim
// a value the exported `tokens.json` disagrees with, and it cannot describe a
// token differently from the Semantics table or the Skill. There is no second
// vocabulary here — every `id` is the id its own table prints.
//
// PURE AND DOM-FREE, so it is testable without a renderer and cannot drift
// with the UI. The builder takes the payload structurally (see
// `TokenSearchSource`) rather than importing the store.
import { ALL_ROLES } from './semanticRoles'
import { CATEGORICAL_ROLE_COMMENTS } from './semanticArchitectures'
import { LAYOUT_ROLES, type LayoutFamily } from './layoutTokens'
import { TYPE_ROLES } from './typeRoles'

/** Figma Variables hierarchy: foundation → collection → group. */
export type TokenCollection = 'primitives' | 'semantics' | 'gradients'

export interface TokenSearchEntry {
  /** Canonical id — the exact string this token's own table row prints. */
  id: string
  /** Display name where it differs from the id (flat roles carry a label). */
  label: string
  /** Foundation key in `FOUNDATIONS` — the navigation target. */
  foundation: string
  collection: TokenCollection
  /**
   * Group inside the collection, when the destination has a group nav to
   * pre-select: a colour family (`accent`), a semantic category (`action`), a
   * layout/type role group. Absent where the table is one flat list.
   */
  group?: string
  /** Resolved value for the requested mode — hex, px, a CSS string. */
  value: string
  /** `var(--…)`, only where `exporters.ts` actually emits one. */
  css?: string
  /** Human prose from the role catalogues. Empty for primitives. */
  description: string
  /** Lowercased, separator-flattened haystack. Built once; see `norm`. */
  haystack: string
}

export interface TokenSearchResult extends TokenSearchEntry {
  score: number
}

/**
 * The slice of `generateTokenJSON()` the index reads. Structural on purpose:
 * the builder stays a pure function of a payload, so a test can hand it a
 * fixture and a caller can hand it the real export.
 */
export interface TokenSearchSource {
  colors: {
    primitive: Record<string, string>
    primitiveAlpha?: Record<string, string>
    themes: Record<string, Record<string, string>>
    themeOrder?: string[]
    semanticArchitecture: string
    architecture?: { tokens?: Record<string, Record<string, Record<string, string>>> } | null
  }
  typography: {
    fontFamily: string
    headingFontFamily?: string
    sizes: Record<string, string>
    lineHeights: Record<string, string>
    weights: Record<string, number>
    roles?: Record<string, { desktop?: { size?: string; weight?: string } }>
  }
  spacing: Record<string, string>
  spacingRoles?: Record<string, string>
  radius: Record<string, string>
  radiusRoles?: Record<string, string>
  sizes: Record<string, string>
  sizeRoles?: Record<string, string>
  selector?: Record<string, string>
  selectorRoles?: Record<string, string>
  stroke?: Record<string, string>
  strokeRoles?: Record<string, string>
  grid: Record<string, string>
  breakpointRoles?: Record<string, string>
  shadows: Record<string, string>
  gradients?: Record<string, string>
}

/**
 * Which foundation owns each layout family's table. `selector` is the one that
 * isn't 1:1: Selectors is a second COLLECTION of the Sizes foundation (the
 * pattern Spacing already proves), so both families navigate to `sizes`.
 */
const LAYOUT_FOUNDATION: Record<LayoutFamily, string> = {
  radius: 'radius',
  spacing: 'spacing',
  size: 'sizes',
  selector: 'sizes',
  stroke: 'stroke',
  breakpoint: 'grid',
}

/** Separators are noise in a query: `action primary` must find `action.primary`. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[-._/]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Role prose carries markup in the flat catalogue and a `[ROLE: …]` tag in the
 *  categorical one. Both are chrome around the sentence that answers a search. */
function plainProse(raw: string | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/^\[ROLE:[^\]]*\]\s*/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cssVar(id: string): string {
  return `var(--${id.replace(/[.\s]/g, '-')})`
}

/** Family a primitive key belongs to, for the Color rail's family nav.
 *  `accent-dark-a-3` → `accent-a`; `neutral-dark-11` → `neutral`. The rail
 *  lists one row per family with light and dark as COLUMNS, so the `-dark`
 *  infix is not a family of its own. */
export function primitiveFamilyOf(key: string): string {
  return key
    .replace(/-\d+$/, '')
    .replace(/-dark(?=(-a)?$)/, '')
}

export function buildTokenSearchIndex(
  source: TokenSearchSource,
  /** Theme whose resolved values the results should print. */
  mode?: string,
): TokenSearchEntry[] {
  const out: TokenSearchEntry[] = []
  const add = (e: Omit<TokenSearchEntry, 'haystack' | 'label' | 'description'> & {
    label?: string
    description?: string
  }) => {
    const label = e.label ?? e.id
    const description = e.description ?? ''
    out.push({
      ...e,
      label,
      description,
      haystack: `${norm(e.id)} ${norm(label)} ${description.toLowerCase()} ${(e.value ?? '').toLowerCase()}`,
    })
  }

  const themeOrder = source.colors.themeOrder ?? Object.keys(source.colors.themes ?? {})
  const theme = mode && (source.colors.themes?.[mode] || themeOrder.includes(mode))
    ? mode
    : themeOrder[0]

  // ── Color · Primitives ────────────────────────────────────────────────────
  // No description: a tone's meaning is its BAND (the "Scale guide" beside the
  // table), not per-token prose, and `accent-9` is what anyone searching for it
  // types. Its hex is in the haystack, so pasting a colour finds its token.
  const addPrimitives = (map: Record<string, string> | undefined) => {
    for (const [id, value] of Object.entries(map ?? {})) {
      add({ id, value, foundation: 'color', collection: 'primitives', group: primitiveFamilyOf(id), css: cssVar(`color-${id}`) })
    }
  }
  addPrimitives(source.colors.primitive)
  addPrimitives(source.colors.primitiveAlpha)

  // ── Color · Semantics ─────────────────────────────────────────────────────
  // Whichever architecture the system standardizes on IS the table on screen,
  // so index that one — indexing both would offer a row that has no table to
  // navigate to.
  const archTokens = source.colors.architecture?.tokens
  if (source.colors.semanticArchitecture === 'categorical' && archTokens) {
    for (const [group, tokens] of Object.entries(archTokens)) {
      for (const [key, byTheme] of Object.entries(tokens)) {
        const id = `${group}.${key}`
        add({
          id,
          value: byTheme[theme] ?? byTheme.light ?? Object.values(byTheme)[0] ?? '',
          foundation: 'color',
          collection: 'semantics',
          group,
          css: cssVar(`color-${id}`),
          description: plainProse(CATEGORICAL_ROLE_COMMENTS[id]),
        })
      }
    }
  } else {
    const values = source.colors.themes?.[theme] ?? {}
    for (const role of ALL_ROLES) {
      add({
        id: role.key,
        label: role.label,
        value: values[role.key] ?? '',
        foundation: 'color',
        collection: 'semantics',
        css: cssVar(`color-${role.key}`),
        description: plainProse(role.description),
      })
    }
  }

  // ── Color · Gradients ─────────────────────────────────────────────────────
  for (const [slug, css] of Object.entries(source.gradients ?? {})) {
    add({ id: slug, value: css, foundation: 'color', collection: 'gradients', css: cssVar(`gradient-${slug}`) })
  }

  // ── Typography ────────────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(source.typography.sizes ?? {})) {
    add({ id: key, value, foundation: 'typography', collection: 'primitives', group: 'size', css: cssVar(`font-size-${key}`) })
  }
  for (const [key, value] of Object.entries(source.typography.lineHeights ?? {})) {
    add({ id: `leading-${key}`, value, foundation: 'typography', collection: 'primitives', group: 'lineHeight', css: cssVar(`line-height-${key}`) })
  }
  for (const [key, value] of Object.entries(source.typography.weights ?? {})) {
    add({ id: `font-weight-${key}`, value: String(value), foundation: 'typography', collection: 'primitives', group: 'weight', css: cssVar(`font-weight-${key}`) })
  }
  add({ id: 'font-family-body', label: 'Body font', value: source.typography.fontFamily, foundation: 'typography', collection: 'primitives', group: 'family', css: cssVar('font-family-body') })
  add({ id: 'font-family-heading', label: 'Heading font', value: source.typography.headingFontFamily ?? source.typography.fontFamily, foundation: 'typography', collection: 'primitives', group: 'family', css: cssVar('font-family-heading') })

  for (const role of TYPE_ROLES) {
    const alias = source.typography.roles?.[role.key]?.desktop
    const size = alias?.size ? source.typography.sizes?.[alias.size] ?? alias.size : ''
    add({
      id: role.key,
      label: role.label,
      value: [size, alias?.weight].filter(Boolean).join(' · '),
      foundation: 'typography',
      collection: 'semantics',
      group: role.group,
      css: cssVar(`type-${role.key}-size`),
      description: plainProse(role.description),
    })
  }

  // ── Layout families (radius · spacing · sizes · selector · stroke · grid) ─
  const layoutPrimitives: { family: LayoutFamily; steps?: Record<string, string>; prefix: string }[] = [
    { family: 'radius', steps: source.radius, prefix: 'radius' },
    { family: 'spacing', steps: source.spacing, prefix: 'spacing' },
    { family: 'size', steps: source.sizes, prefix: 'size' },
    { family: 'selector', steps: source.selector, prefix: 'selector' },
    { family: 'stroke', steps: source.stroke, prefix: 'stroke' },
    { family: 'breakpoint', steps: source.grid, prefix: 'grid' },
  ]
  for (const { family, steps, prefix } of layoutPrimitives) {
    for (const [key, value] of Object.entries(steps ?? {})) {
      add({
        id: `${prefix}-${key}`,
        value,
        foundation: LAYOUT_FOUNDATION[family],
        collection: 'primitives',
        css: cssVar(`${prefix}-${key}`),
      })
    }
  }

  const layoutRoleValues: Record<LayoutFamily, { roles?: Record<string, string>; steps?: Record<string, string>; prefix: string }> = {
    radius: { roles: source.radiusRoles, steps: source.radius, prefix: 'radius' },
    spacing: { roles: source.spacingRoles, steps: source.spacing, prefix: 'spacing' },
    size: { roles: source.sizeRoles, steps: source.sizes, prefix: 'size' },
    selector: { roles: source.selectorRoles, steps: source.selector, prefix: 'selector' },
    stroke: { roles: source.strokeRoles, steps: source.stroke, prefix: 'stroke' },
    breakpoint: { roles: source.breakpointRoles, steps: source.grid, prefix: 'breakpoint' },
  }
  for (const family of Object.keys(LAYOUT_ROLES) as LayoutFamily[]) {
    const { roles, steps, prefix } = layoutRoleValues[family]
    for (const role of LAYOUT_ROLES[family]) {
      // A role ALIASES a step, so print what it resolves to and keep the step
      // name searchable — `radius.action` and `radius-sm` are two honest ways
      // to arrive at the same 8px.
      const step = roles?.[role.key] ?? role.primitive
      const resolved = steps?.[step]
      add({
        id: `${family}.${role.key}`,
        label: role.label,
        value: resolved ? `${resolved} · ${step}` : step,
        foundation: LAYOUT_FOUNDATION[family],
        collection: 'semantics',
        group: role.group,
        css: cssVar(`${prefix}-${role.key}`),
        description: plainProse(role.description),
      })
    }
  }

  // ── Shadow ────────────────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(source.shadows ?? {})) {
    add({ id: `shadow-${key}`, value, foundation: 'shadow', collection: 'primitives', css: cssVar(`shadow-${key}`) })
  }

  return out
}

/** Foundation order in the results list — the rail's own order, so a reader
 *  scanning results is scanning the same sequence as the icon rail. */
const FOUNDATION_ORDER = ['color', 'typography', 'radius', 'spacing', 'grid', 'sizes', 'stroke', 'shadow', 'icons']

/**
 * Rank one query against the index.
 *
 * The tiers exist so an EXACT token name always outranks a token that merely
 * mentions the word in its prose: typing `accent-9` must not bury that tone
 * under nine roles whose descriptions say "accent". Prose matching is what
 * makes a component word like `button` work at all, so it scores — just last.
 */
export function searchTokens(index: TokenSearchEntry[], query: string, limit = 40): {
  results: TokenSearchResult[]
  total: number
} {
  const raw = query.trim().toLowerCase()
  if (!raw) return { results: [], total: 0 }
  const q = norm(raw)
  // A hex query is pasted with or without the `#`, and the index stores values
  // as the export writes them.
  const hex = raw.startsWith('#') ? raw.slice(1) : null

  const scored: TokenSearchResult[] = []
  for (const e of index) {
    const id = norm(e.id)
    const label = norm(e.label)
    const value = e.value.toLowerCase()
    const description = e.description.toLowerCase()

    let score = 0
    if (id === q || label === q) score = 100
    else if (id.startsWith(q) || label.startsWith(q)) score = 80
    else if (value === q || (hex && value.includes(hex))) score = 70
    else if (new RegExp(`\\b${escapeRe(q)}`).test(id) || new RegExp(`\\b${escapeRe(q)}`).test(label)) score = 60
    else if (id.includes(q) || label.includes(q)) score = 50
    else if (e.css?.toLowerCase().includes(raw)) score = 45
    else if (new RegExp(`\\b${escapeRe(q)}`).test(description)) score = 30
    else if (e.haystack.includes(q)) score = 15
    if (!score) continue

    // Shorter ids are the more general token (`action.primary` before
    // `action.primary.pressed`), and the rail's order breaks the rest.
    const fIdx = FOUNDATION_ORDER.indexOf(e.foundation)
    scored.push({ ...e, score: score * 1000 - e.id.length * 4 - (fIdx < 0 ? 99 : fIdx) })
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return { results: scored.slice(0, limit), total: scored.length }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Results grouped for display, preserving rank order within each foundation. */
export function groupResults(results: TokenSearchResult[]): { foundation: string; results: TokenSearchResult[] }[] {
  const byFoundation = new Map<string, TokenSearchResult[]>()
  for (const r of results) {
    const list = byFoundation.get(r.foundation)
    if (list) list.push(r)
    else byFoundation.set(r.foundation, [r])
  }
  return [...byFoundation.entries()]
    .sort((a, b) => FOUNDATION_ORDER.indexOf(a[0]) - FOUNDATION_ORDER.indexOf(b[0]))
    .map(([foundation, list]) => ({ foundation, results: list }))
}
