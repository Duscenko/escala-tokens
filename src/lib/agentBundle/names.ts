import { mdCell, slugify } from '../utils.js'

export const GROUP_ORDER = ['content', 'action', 'surface', 'status', 'border'] as const
export type SemanticGroup = (typeof GROUP_ORDER)[number]

export const GROUP_LABEL: Record<SemanticGroup, string> = {
  content: 'Content',
  action: 'Action',
  surface: 'Surface',
  status: 'Status',
  border: 'Border',
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
export function figmaPrimitiveName(key: string, ctx?: PrimitiveNameContext): string {
  const dash = key.lastIndexOf('-')
  if (dash === -1) return key
  const family = key.slice(0, dash)
  const tone = key.slice(dash + 1)
  const padded = /^\d$/.test(tone) ? `0${tone}` : tone
  return `${primitiveGroupFor(family, ctx)}/${padded}`
}

export function figmaSpacingName(key: string): string {
  return /^\d/.test(key) ? `step/${key}` : key
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
  return '`FRAME_FILL`'
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
