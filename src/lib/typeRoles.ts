// Text semantic roles — the Typography twin of Color's ROLE_GROUPS.
// Primitives (family / size / weight / line-height) are the raw scale.
// A role is an ALIAS: label, placeholder, heading, … each pointing at those
// primitives, with a Desktop and a Mobile mapping (Color's light/dark analogue).
// Line-height always follows the chosen size step — the same pairing
// typographyStandard already enforces on the primitive ramp.

import {
  FONT_WEIGHT_BASES,
  TYPE_SCALE_KEYS,
  type TypeScaleKey,
} from './typographyStandard'

export type TypeFamilyRole = 'display' | 'body'
export type TypeWeightKey = (typeof FONT_WEIGHT_BASES)[number]['key']

export interface TypeAlias {
  family: TypeFamilyRole
  size: TypeScaleKey
  weight: TypeWeightKey
}

export interface TypeRoleModes {
  desktop: TypeAlias
  mobile: TypeAlias
}

export type TypeRoleGroupId = 'display' | 'heading' | 'body' | 'control'

export interface TypeRole {
  key: string
  label: string
  description: string
  group: TypeRoleGroupId
  desktop: TypeAlias
  mobile: TypeAlias
}

const a = (
  family: TypeFamilyRole,
  size: TypeScaleKey,
  weight: TypeWeightKey,
): TypeAlias => ({ family, size, weight })

export const TYPE_ROLE_GROUPS: { id: TypeRoleGroupId; label: string; hint: string }[] = [
  { id: 'display', label: 'Display', hint: 'Page-level statements. One per screen.' },
  { id: 'heading', label: 'Heading', hint: 'Section titles. Display family, semibold.' },
  { id: 'body', label: 'Body', hint: 'Reading text. Body family, regular.' },
  { id: 'control', label: 'Control', hint: 'Labels, placeholders, captions, buttons.' },
]

/** Canonical catalogue. Keys are CSS/Figma names (`text-label`, `text-placeholder`). */
export const TYPE_ROLES: TypeRole[] = [
  {
    key: 'display',
    label: 'Display',
    description: 'Hero and page titles.',
    group: 'display',
    desktop: a('display', 'display-xl', 'bold'),
    mobile: a('display', 'display-lg', 'bold'),
  },
  {
    key: 'heading-xl',
    label: 'Heading XL',
    description: 'Largest section title.',
    group: 'heading',
    desktop: a('display', 'display-lg', 'semibold'),
    mobile: a('display', 'display-md', 'semibold'),
  },
  {
    key: 'heading-lg',
    label: 'Heading LG',
    description: 'Primary section heading.',
    group: 'heading',
    desktop: a('display', 'display-md', 'semibold'),
    mobile: a('display', 'display-sm', 'semibold'),
  },
  {
    key: 'heading-md',
    label: 'Heading MD',
    description: 'Card and panel titles.',
    group: 'heading',
    desktop: a('display', 'display-sm', 'semibold'),
    mobile: a('display', 'display-xs', 'semibold'),
  },
  {
    key: 'heading-sm',
    label: 'Heading SM',
    description: 'Nested headings and list titles.',
    group: 'heading',
    desktop: a('display', 'display-xs', 'semibold'),
    mobile: a('display', 'text-xl', 'semibold'),
  },
  {
    key: 'heading-xs',
    label: 'Heading XS',
    description: 'Overline-scale titles still read as headings.',
    group: 'heading',
    desktop: a('display', 'text-xl', 'semibold'),
    mobile: a('display', 'text-lg', 'semibold'),
  },
  {
    key: 'body-lg',
    label: 'Body LG',
    description: 'Lead paragraphs.',
    group: 'body',
    desktop: a('body', 'text-lg', 'regular'),
    mobile: a('body', 'text-md', 'regular'),
  },
  {
    key: 'body-md',
    label: 'Body MD',
    description: 'Default reading size.',
    group: 'body',
    desktop: a('body', 'text-md', 'regular'),
    mobile: a('body', 'text-sm', 'regular'),
  },
  {
    key: 'body-sm',
    label: 'Body SM',
    description: 'Dense supporting copy.',
    group: 'body',
    desktop: a('body', 'text-sm', 'regular'),
    mobile: a('body', 'text-xs', 'regular'),
  },
  {
    key: 'label',
    label: 'Label',
    description: 'Form labels and field names.',
    group: 'control',
    desktop: a('body', 'text-sm', 'medium'),
    mobile: a('body', 'text-xs', 'medium'),
  },
  {
    key: 'placeholder',
    label: 'Placeholder',
    description: 'Input placeholder and empty-field hint.',
    group: 'control',
    desktop: a('body', 'text-md', 'regular'),
    mobile: a('body', 'text-sm', 'regular'),
  },
  {
    key: 'caption',
    label: 'Caption',
    description: 'Image captions and metadata.',
    group: 'control',
    desktop: a('body', 'text-xs', 'regular'),
    mobile: a('body', 'text-xs', 'regular'),
  },
  {
    key: 'button',
    label: 'Button',
    description: 'Control labels — buttons, tabs, chips.',
    group: 'control',
    // `text-sm`, matching `label` — a button label and a field label are the
    // same TIER of text; the button is just heavier. It was `text-md`, a full
    // step above `label` and above body copy, which made the button the
    // LARGEST text on screen: measured 17px against 15px body on the three
    // styles that use the `comfortable` type scale (×1.0625), because the scale
    // multiplies every step and `text-md` is the body size. Now 12–15px across
    // the six styles, under the 16px ceiling a control label should respect.
    //
    // Capping the resolved px instead was considered and rejected: the CSS
    // export emits `var(--font-size-text-md)` for this role, so a numeric clamp
    // would show 16px in the preview and ship 17px, which is exactly the kind
    // of preview/export drift this file's aliases exist to prevent. Moving the
    // ALIAS keeps one value in both. Desktop now also agrees with mobile, which
    // already used `text-sm`.
    desktop: a('body', 'text-sm', 'semibold'),
    mobile: a('body', 'text-sm', 'semibold'),
  },
  {
    key: 'helper',
    label: 'Helper',
    description: 'Field help, validation, footnotes.',
    group: 'control',
    desktop: a('body', 'text-xs', 'regular'),
    mobile: a('body', 'text-xs', 'regular'),
  },
]

export const TYPE_ROLE_BY_KEY: Record<string, TypeRole> = Object.fromEntries(
  TYPE_ROLES.map((r) => [r.key, r]),
)

export function typeRolesInGroup(group: TypeRoleGroupId | 'all'): TypeRole[] {
  if (group === 'all') return TYPE_ROLES
  return TYPE_ROLES.filter((r) => r.group === group)
}

const WEIGHT_KEYS = new Set(FONT_WEIGHT_BASES.map((b) => b.key))
const SIZE_KEYS = new Set<string>(TYPE_SCALE_KEYS)

function isAlias(v: unknown): v is TypeAlias {
  if (!v || typeof v !== 'object') return false
  const a = v as TypeAlias
  return (
    (a.family === 'display' || a.family === 'body') &&
    SIZE_KEYS.has(a.size) &&
    WEIGHT_KEYS.has(a.weight)
  )
}

function isModes(v: unknown): v is TypeRoleModes {
  if (!v || typeof v !== 'object') return false
  const m = v as TypeRoleModes
  return isAlias(m.desktop) && isAlias(m.mobile)
}

/** Seed or repair a stored map so every catalogue role is present. User edits
 *  on a known role are kept; unknown keys are dropped. */
export function mergeTypeRoles(
  stored?: object | null,
): Record<string, TypeRoleModes> {
  const bag = (stored ?? {}) as Record<string, unknown>
  const out: Record<string, TypeRoleModes> = {}
  for (const role of TYPE_ROLES) {
    const hit = bag[role.key]
    out[role.key] = isModes(hit)
      ? { desktop: { ...hit.desktop }, mobile: { ...hit.mobile } }
      : { desktop: { ...role.desktop }, mobile: { ...role.mobile } }
  }
  return out
}

export function aliasesEqual(a: TypeAlias, b: TypeAlias): boolean {
  return a.family === b.family && a.size === b.size && a.weight === b.weight
}

export function roleIsDefault(key: string, modes: TypeRoleModes): boolean {
  const spec = TYPE_ROLE_BY_KEY[key]
  if (!spec) return true
  return aliasesEqual(modes.desktop, spec.desktop) && aliasesEqual(modes.mobile, spec.mobile)
}

export interface TypePrimitives {
  fontFamily: string
  headingFontFamily?: string
  sizes: Record<string, string>
  lineHeights?: Record<string, string>
  weights: Record<string, number>
}

export interface ResolvedTypeStyle {
  family: string
  size: string
  lineHeight: string
  weight: number
  alias: TypeAlias
}

export function resolveTypeStyle(
  alias: TypeAlias,
  primitives: TypePrimitives,
): ResolvedTypeStyle {
  const family =
    alias.family === 'display'
      ? primitives.headingFontFamily ?? primitives.fontFamily
      : primitives.fontFamily
  return {
    family,
    size: primitives.sizes[alias.size] ?? '',
    lineHeight: primitives.lineHeights?.[alias.size] ?? primitives.sizes[alias.size] ?? '',
    weight: primitives.weights[alias.weight] ?? 400,
    alias,
  }
}

/** Resolved CSS fields for a named text role. Preview / Docs / Components
 *  consume this so specimens stay bound to Semantics, not raw px. */
export function typeStyleCss(
  primitives: TypePrimitives,
  storedRoles: object | null | undefined,
  role: string,
  opts: { viewport?: 'desktop' | 'mobile'; leading?: boolean } = {},
): { family: string; size: string; weight: number; lineHeight?: string } {
  const viewport = opts.viewport ?? 'desktop'
  const roles = mergeTypeRoles(storedRoles)
  const spec = TYPE_ROLE_BY_KEY[role]
  const alias = roles[role]?.[viewport] ?? spec?.[viewport]
  if (!alias) return { family: primitives.fontFamily, size: '', weight: 400 }
  const s = resolveTypeStyle(alias, primitives)
  return {
    family: s.family,
    size: s.size,
    weight: s.weight,
    ...(opts.leading === false ? {} : { lineHeight: s.lineHeight }),
  }
}

export type TypeFacet = 'family' | 'size' | 'weight' | 'leading'

/** CSS custom property stem — `text-label` → `--text-label-font-size`. */
export function typeRoleVar(key: string, facet: TypeFacet, viewport: 'desktop' | 'mobile' = 'desktop'): string {
  const suffix =
    facet === 'family' ? 'font-family'
    : facet === 'size' ? 'font-size'
    : facet === 'weight' ? 'font-weight'
    : 'line-height'
  const base = `--text-${key}-${suffix}`
  return viewport === 'mobile' ? `${base}-mobile` : base
}

export function primitiveVar(alias: TypeAlias, facet: TypeFacet): string {
  if (facet === 'family') return `var(--font-family-${alias.family === 'display' ? 'heading' : 'body'})`
  if (facet === 'size') return `var(--font-size-${alias.size})`
  if (facet === 'weight') return `var(--font-weight-${alias.weight})`
  return `var(--line-height-${alias.size})`
}

const FACETS: TypeFacet[] = ['family', 'size', 'weight', 'leading']

/** Desktop + `-mobile` alias declarations. Safe inside `:root`. */
export function typeRoleCssVars(roles?: object | null): string[] {
  const map = mergeTypeRoles(roles)
  const lines: string[] = []
  for (const role of TYPE_ROLES) {
    const m = map[role.key]
    for (const facet of FACETS) {
      lines.push(`${typeRoleVar(role.key, facet)}: ${primitiveVar(m.desktop, facet)};`)
      lines.push(`${typeRoleVar(role.key, facet, 'mobile')}: ${primitiveVar(m.mobile, facet)};`)
    }
  }
  return lines
}
