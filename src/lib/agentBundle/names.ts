import { mdCell, slugify } from '../utils.js'

export const GROUP_ORDER = ['content', 'action', 'surface', 'status', 'border', 'elevation'] as const
export type SemanticGroup = (typeof GROUP_ORDER)[number]

export const GROUP_LABEL: Record<SemanticGroup, string> = {
  content: 'Content',
  action: 'Action',
  surface: 'Surface',
  status: 'Status',
  border: 'Border',
  elevation: 'Elevation',
}

const PRIMITIVE_GROUPS: Record<string, string> = {
  accent: 'Accent', brand: 'Accent',
  'accent-dark': 'Accent Dark', 'brand-dark': 'Accent Dark',
  neutral: 'Neutral', gray: 'Neutral',
  'neutral-dark': 'Neutral Dark', 'gray-dark': 'Neutral Dark',
  error: 'States/Error', 'error-dark': 'States/Error Dark',
  success: 'States/Success', 'success-dark': 'States/Success Dark',
  warning: 'States/Warning', 'warning-dark': 'States/Warning Dark',
  info: 'States/Info', 'info-dark': 'States/Info Dark',
}

export function skillName(project: string): string {
  const slug = slugify(project) || 'design-system'
  const base = slug.endsWith('-design-system') ? slug : `${slug}-design-system`
  return base.replace(/^-+/, '').slice(0, 64).replace(/-+$/, '') || 'design-system'
}

export function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(mdCell).join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`),
  ].join('\n')
}

/** Categorical id → Figma variable (`content.link.default` → `Content/link/default`). */
export function figmaSemanticName(id: string): string {
  const [group, ...rest] = id.split('.')
  const label = GROUP_LABEL[group as SemanticGroup]
    ?? (group ? group.charAt(0).toUpperCase() + group.slice(1) : id)
  return rest.length ? `${label}/${rest.join('/')}` : label
}

/**
 * Theme context the naming needs, a structural subset of `TokenJSON['colors']`
 * so this module keeps its no-store, no-tokenGenerator boundary.
 */
export interface PrimitiveNameContext {
  themeSources?: Record<string, Partial<Record<string, string>>>
  themeOrder?: string[]
  themeLabels?: Record<string, string>
  /** The names brands were given in the plugin (Add brand), by slug. Read only
   *  to label per-brand state ramps, like the plugin's `brandLabelOf`. */
  studioThemes?: Record<string, { name?: string } | undefined>
}

/** `hola::light` → `hola`; a plain key (`light`) is its own brand. */
export function brandOfKey(key: string): string {
  const i = key.indexOf('::')
  return i === -1 ? key : key.slice(0, i)
}

/** The brands behind a payload's `brand::appearance` columns, in column order.
 *  Mirrors the plugin's `brandSlugsOf`. */
export function brandSlugsOf(ctx?: Pick<PrimitiveNameContext, 'themeOrder'>): string[] {
  const out: string[] = []
  for (const key of ctx?.themeOrder ?? []) {
    if (key.indexOf('::') <= 0) continue
    const slug = brandOfKey(key)
    if (!out.includes(slug)) out.push(slug)
  }
  return out
}

/** "Hola Light" → "Hola": a brand's name without its appearance. Mirrors the
 *  plugin's `brandLabelOf` (the Brand collection's mode names). */
export function brandLabelOf(slug: string, ctx?: PrimitiveNameContext): string {
  const own = ctx?.studioThemes?.[slug]?.name?.trim()
  if (own) return own
  const key = (ctx?.themeOrder ?? []).find((k) => brandOfKey(k) === slug)
  const labeled = key ? ctx?.themeLabels?.[key]?.trim() : undefined
  if (labeled) {
    const bare = labeled.replace(/\s+(light|dark)$/i, '').trim()
    if (bare) return bare
  }
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const STATE_SLOTS = new Set(['error', 'warning', 'success', 'info'])

/** `accent-dark` → `accent`, `accent-a` → `accent`; `black-a`/`white-a` are
 *  whole families, not twins, so they keep their suffix. */
function familyBaseKey(family: string): string {
  let base = family
  if (base.endsWith('-dark')) base = base.slice(0, -5)
  if (base.endsWith('-a') && base !== 'black-a' && base !== 'white-a') base = base.slice(0, -2)
  return base
}

function slotFolderFor(family: string): 'Accents' | 'Neutrals' | 'States' {
  const raw = familyBaseKey(family)
  if (raw === 'black-a' || raw === 'white-a' || raw === 'black' || raw === 'white') return 'Neutrals'
  if (raw === 'accent' || raw === 'brand') return 'Accents'
  if (raw === 'neutral' || raw === 'gray') return 'Neutrals'
  if (STATE_SLOTS.has(raw)) return 'States'
  const seg = raw.replace(/-\d+$/, '').split('-').pop() ?? ''
  if (seg === 'gray') return 'Neutrals'
  if (STATE_SLOTS.has(seg)) return 'States'
  return 'Accents'
}

/** A theme-minted family carries its slot in the LAST segment
 *  (`material--elevation-error` is the Error ramp of the Material theme). */
function stateSlotLabel(family: string): string | undefined {
  const raw = familyBaseKey(family)
  if (STATE_SLOTS.has(raw)) return cap(raw)
  const seg = raw.replace(/-\d+$/, '').split('-').pop() ?? ''
  return STATE_SLOTS.has(seg) ? cap(seg) : undefined
}

function titleCaseFamily(family: string): string {
  return family.replace(/-+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

function themesUsingFamily(family: string, ctx?: PrimitiveNameContext): string[] {
  const base = familyBaseKey(family)
  const sources = ctx?.themeSources ?? {}
  return (ctx?.themeOrder ?? []).filter((t) => Object.values(sources[t] ?? {}).includes(base))
}

export function shippedThemeLabel(key: string, ctx?: PrimitiveNameContext): string {
  const labeled = ctx?.themeLabels?.[key]?.trim()
  if (labeled) return labeled
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function primitiveGroupFor(family: string, ctx?: PrimitiveNameContext): string {
  const slot = stateSlotLabel(family)
  if (slot) {
    const folder = family.endsWith('-dark') ? `${slot} Dark` : slot
    const owners = themesUsingFamily(family, ctx)
    // Two or more brands: each brand's state ramps sit under its own name, even
    // when its Light AND Dark columns use them (the plugin's `brandOwningFamily`).
    if (brandSlugsOf(ctx).length >= 2) {
      const brands = [...new Set(owners.map(brandOfKey))]
      if (brands.length === 1) return `States/${brandLabelOf(brands[0]!, ctx)}/${folder}`
    }
    if (owners.length === 1 && (ctx?.themeOrder?.length ?? 0) > 1) {
      return `States/${shippedThemeLabel(owners[0]!, ctx)}/${folder}`
    }
    if (PRIMITIVE_GROUPS[family]) return PRIMITIVE_GROUPS[family]
    return `States/${folder}`
  }
  // Built-in Accent / Neutral sit under the same top-level folders as minted
  // families (Accents → Neutrals → States), not as sibling groups Figma would
  // interleave with custom ramps.
  if (PRIMITIVE_GROUPS[family]) return `${slotFolderFor(family)}/${PRIMITIVE_GROUPS[family]}`
  if (family.includes('/')) {
    return family.split('/').map((seg) => PRIMITIVE_GROUPS[seg] ?? cap(seg)).join('/')
  }
  return `${slotFolderFor(family)}/${titleCaseFamily(family)}`
}

/**
 * MIRRORS the plugin's `primitiveVarName` (`../escala-figma-plugin/src/code.ts`),
 * which is the source of truth for what a Figma variable is actually called.
 *
 * This used to be the plugin's `legacyPrimitiveVarName` — the pre-slot-folder
 * shape the plugin keeps ONLY to rename old variables in place on re-import.
 * So `resolve_token` was handing agents a name that no longer exists in any
 * file the current plugin writes: measured against two live published systems,
 * 48/144 primitive names disagreed on the built-in one (every Accent and
 * Neutral, light and dark) and 144/144 on a themed one. `Accent/01` is really
 * `Accents/Accent/01`; a theme-minted `material--elevation-error-1` is really
 * `States/Error/01`, not `Material--elevation-error/01`.
 *
 * `ctx` is optional so existing callers keep compiling; without it the slot
 * folders are still correct and only per-theme State nesting (which needs
 * `themeSources`) is skipped.
 */
/**
 * Every Figma name this primitive has EVER been written under — current first.
 *
 * Emitting the corrected name is only half the job: an agent holding a name
 * from an older file (or from this server's own previous answers) would get
 * "unknown token" for a ramp that exists. The plugin keeps the same list
 * (`previousPrimitiveVarNames`) so re-import renames in place instead of
 * orphaning bindings; lookup here accepts what the plugin still recognises.
 */
/** Figma group path → canonical flat family, for the reverse direction. */
const FAMILY_FROM_GROUP: Record<string, string> = {
  Accent: 'accent', 'Accent Dark': 'accent-dark',
  Neutral: 'neutral', 'Neutral Dark': 'neutral-dark',
  'States/Error': 'error', 'States/Error Dark': 'error-dark',
  'States/Success': 'success', 'States/Success Dark': 'success-dark',
  'States/Warning': 'warning', 'States/Warning Dark': 'warning-dark',
  'States/Info': 'info', 'States/Info Dark': 'info-dark',
}

/**
 * `Accents/Accent/09` → `accent-9`. The inverse of the CANONICAL naming only —
 * a theme-minted family (`Accents/Material Elevation/01`) has no canonical
 * form and returns null, because it is already addressable by its own key.
 *
 * This is what lets a Figma-shaped query reach a theme-minted ramp: the caller
 * normalises to `accent-9` and the `themeSources` alias resolves it from there.
 * Zero-padding is dropped so `09` and `9` are one token.
 */
export function flatKeyFromFigmaName(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.includes('/')) return null
  const cut = trimmed.lastIndexOf('/')
  const tone = trimmed.slice(cut + 1)
  if (!/^\d+$/.test(tone)) return null
  let group = trimmed.slice(0, cut)
  const family = FAMILY_FROM_GROUP[group]
    ?? (/^(Accents|Neutrals)\//.test(group) ? FAMILY_FROM_GROUP[(group = group.slice(group.indexOf('/') + 1))] : undefined)
  if (!family) return null
  return `${family}-${String(Number(tone))}`
}

export function figmaPrimitiveNameAliases(key: string, ctx?: PrimitiveNameContext): string[] {
  const dash = key.lastIndexOf('-')
  if (dash === -1) return [key]
  const family = key.slice(0, dash)
  const tone = key.slice(dash + 1)
  const padded = /^\d$/.test(tone) ? `0${tone}` : tone
  const legacyGroup = PRIMITIVE_GROUPS[family]
    ?? family.split('/').map((seg) => PRIMITIVE_GROUPS[seg] ?? cap(seg)).join('/')
  return [...new Set([
    figmaPrimitiveName(key, ctx),
    `${legacyGroup}/${padded}`,
    `${slotFolderFor(family)}/${titleCaseFamily(family)}/${padded}`,
  ])]
}

export function figmaPrimitiveName(key: string, ctx?: PrimitiveNameContext): string {
  const dash = key.lastIndexOf('-')
  if (dash === -1) return key
  const family = key.slice(0, dash)
  const tone = key.slice(dash + 1)
  const padded = /^\d$/.test(tone) ? `0${tone}` : tone
  return `${primitiveGroupFor(family, ctx)}/${padded}`
}

/** Spacing step's Figma name — a group of `Dimension Semantics` now, where a
 *  numeric step needs no `step/` shelter (`Spacing/4`). */
export function figmaSpacingName(key: string): string {
  return figmaDimensionName('Spacing', key)
}

/** `Dimension Semantics` variable: `<Group>/<step>` (`Radius/lg`, `Stroke/sm`). */
export function figmaDimensionName(group: string, key: string): string {
  return `${group}/${key}`
}

export function webCodeSyntax(id: string): string {
  return `var(--color-${id.replace(/\./g, '-')})`
}

export function scopesFor(id: string): string {
  if (id.startsWith('content.')) return '`TEXT_FILL`'
  if (id.startsWith('action.') || id.startsWith('surface.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.endsWith('.content') || id.endsWith('.on-solid')) return '`TEXT_FILL`'
  if (id.startsWith('status.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.startsWith('border.')) return '`STROKE_COLOR`'
  if (id.startsWith('elevation.')) return '`EFFECT_COLOR`'
  return '`FRAME_FILL`'
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
