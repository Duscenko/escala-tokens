// Text semantic roles — the Typography twin of Color's ROLE_GROUPS.
// Primitives (family / size / weight / line-height) are the raw scale.
// A role is an ALIAS: label, placeholder, heading, … each pointing at those
// primitives, with a Desktop, Tablet and Mobile mapping (Color's light/dark
// analogue, with a third column).
// Line-height always follows the chosen size step — the same pairing
// typographyStandard already enforces on the primitive ramp.
//
// Display and headings STEP on a narrow viewport. Body and control roles do
// NOT: shrinking reading text between breakpoints breaks 45–75 characters per
// line. Mobile aliases for those groups equal desktop.
//
// THREE CUTS, and how far each one steps (v75):
// - Tablet steps only the two sizes that overflow a ~768px column (Display,
//   Heading XL) by one rung. Smaller headings already fit, so they hold their
//   desktop size. Tablet was a copy of desktop before (no third column), so
//   picking it in the Platform switch changed nothing anywhere.
// - Mobile steps Display and Heading XL by TWO rungs and the rest of the
//   headings by one. One rung was too little at the top: Display resolved to
//   ~51px on a 375px phone, where Untitled UI / Material land around 36–48px.
//   Two rungs puts it at ~38px on the comfortable scale.
// Weights never change across cuts; no reference system does that.

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

export const TYPE_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
export type TypeViewport = (typeof TYPE_VIEWPORTS)[number]

export interface TypeRoleModes {
  desktop: TypeAlias
  tablet: TypeAlias
  mobile: TypeAlias
}

export type TypeRoleGroupId = 'display' | 'heading' | 'body' | 'control'

export interface TypeRole {
  key: string
  label: string
  description: string
  group: TypeRoleGroupId
  desktop: TypeAlias
  tablet: TypeAlias
  mobile: TypeAlias
}

const a = (
  family: TypeFamilyRole,
  size: TypeScaleKey,
  weight: TypeWeightKey,
): TypeAlias => ({ family, size, weight })

export const TYPE_ROLE_GROUPS: { id: TypeRoleGroupId; label: string; hint: string }[] = [
  { id: 'display', label: 'Display', hint: 'Page-level statements. One per screen.' },
  { id: 'heading', label: 'Heading', hint: 'Section titles. Body family by default — size and semibold carry the hierarchy.' },
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
    tablet: a('display', 'display-lg', 'bold'),
    mobile: a('display', 'display-md', 'bold'),
  },
  {
    key: 'heading-xl',
    label: 'Heading XL',
    description: 'Largest section title.',
    group: 'heading',
    desktop: a('body', 'display-lg', 'semibold'),
    tablet: a('body', 'display-md', 'semibold'),
    mobile: a('body', 'display-sm', 'semibold'),
  },
  {
    key: 'heading-lg',
    label: 'Heading LG',
    description: 'Primary section heading.',
    group: 'heading',
    desktop: a('body', 'display-md', 'semibold'),
    tablet: a('body', 'display-md', 'semibold'),
    mobile: a('body', 'display-sm', 'semibold'),
  },
  {
    key: 'heading-md',
    label: 'Heading MD',
    description: 'Card and panel titles.',
    group: 'heading',
    desktop: a('body', 'display-sm', 'semibold'),
    tablet: a('body', 'display-sm', 'semibold'),
    mobile: a('body', 'display-xs', 'semibold'),
  },
  {
    key: 'heading-sm',
    label: 'Heading SM',
    description: 'Nested headings and list titles.',
    group: 'heading',
    desktop: a('body', 'display-xs', 'semibold'),
    tablet: a('body', 'display-xs', 'semibold'),
    mobile: a('body', 'text-xl', 'semibold'),
  },
  {
    key: 'heading-xs',
    label: 'Heading XS',
    description: 'Overline-scale titles still read as headings.',
    group: 'heading',
    desktop: a('body', 'text-xl', 'semibold'),
    tablet: a('body', 'text-xl', 'semibold'),
    mobile: a('body', 'text-lg', 'semibold'),
  },
  {
    key: 'body-lg',
    label: 'Body LG',
    description: 'Lead paragraphs.',
    group: 'body',
    desktop: a('body', 'text-lg', 'regular'),
    tablet: a('body', 'text-lg', 'regular'),
    mobile: a('body', 'text-lg', 'regular'),
  },
  {
    key: 'body-md',
    label: 'Body MD',
    description: 'Default reading size.',
    group: 'body',
    desktop: a('body', 'text-md', 'regular'),
    tablet: a('body', 'text-md', 'regular'),
    mobile: a('body', 'text-md', 'regular'),
  },
  {
    key: 'body-sm',
    label: 'Body SM',
    description: 'Dense supporting copy.',
    group: 'body',
    desktop: a('body', 'text-sm', 'regular'),
    tablet: a('body', 'text-sm', 'regular'),
    mobile: a('body', 'text-sm', 'regular'),
  },
  {
    key: 'label',
    label: 'Label',
    description: 'Form labels and field names.',
    group: 'control',
    desktop: a('body', 'text-sm', 'medium'),
    tablet: a('body', 'text-sm', 'medium'),
    mobile: a('body', 'text-sm', 'medium'),
  },
  {
    key: 'placeholder',
    label: 'Placeholder',
    description: 'Input placeholder and empty-field hint.',
    group: 'control',
    desktop: a('body', 'text-md', 'regular'),
    tablet: a('body', 'text-md', 'regular'),
    mobile: a('body', 'text-md', 'regular'),
  },
  {
    key: 'caption',
    label: 'Caption',
    description: 'Image captions and metadata.',
    group: 'control',
    desktop: a('body', 'text-xs', 'regular'),
    tablet: a('body', 'text-xs', 'regular'),
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
    // ALIAS keeps one value in both. Body and control stay the same size on
    // mobile — only display/heading step.
    desktop: a('body', 'text-sm', 'semibold'),
    tablet: a('body', 'text-sm', 'semibold'),
    mobile: a('body', 'text-sm', 'semibold'),
  },
  {
    key: 'helper',
    label: 'Helper',
    description: 'Field help, validation, footnotes.',
    group: 'control',
    desktop: a('body', 'text-xs', 'regular'),
    tablet: a('body', 'text-xs', 'regular'),
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

/** Headings follow the body stack. Only `display` may alias the heading font.
 *  Size and weight stay as stored; family is the locked facet. */
function withLockedFamily(role: TypeRole, alias: TypeAlias): TypeAlias {
  if (role.group !== 'heading') return alias
  return alias.family === 'body' ? alias : { ...alias, family: 'body' }
}

/** Desktop + mobile are required; tablet is optional so a pre-v75 map (two
 *  columns) still counts as stored edits rather than being thrown away. */
function isModes(v: unknown): v is Omit<TypeRoleModes, 'tablet'> & { tablet?: unknown } {
  if (!v || typeof v !== 'object') return false
  const m = v as TypeRoleModes
  return isAlias(m.desktop) && isAlias(m.mobile)
}

/** Seed or repair a stored map so every catalogue role is present. User edits
 *  on a known role are kept; unknown keys are dropped.
 *
 *  A stored role with no TABLET alias (anything saved before v75) gets one by
 *  detection, not assumption: if its desktop is still the catalogue default,
 *  it takes the catalogue tablet step; if someone picked their own desktop
 *  size, tablet copies THAT, which is exactly what tablet rendered before
 *  (it read the desktop alias). Nobody's hand-picked heading moves. */
export function mergeTypeRoles(
  stored?: object | null,
): Record<string, TypeRoleModes> {
  const bag = (stored ?? {}) as Record<string, unknown>
  const out: Record<string, TypeRoleModes> = {}
  for (const role of TYPE_ROLES) {
    const hit = bag[role.key]
    if (isModes(hit)) {
      const tablet = isAlias(hit.tablet)
        ? hit.tablet
        : aliasesEqual(hit.desktop, role.desktop) ? role.tablet : hit.desktop
      out[role.key] = {
        desktop: withLockedFamily(role, { ...hit.desktop }),
        tablet: withLockedFamily(role, { ...tablet }),
        mobile: withLockedFamily(role, { ...hit.mobile }),
      }
    } else {
      out[role.key] = { desktop: { ...role.desktop }, tablet: { ...role.tablet }, mobile: { ...role.mobile } }
    }
  }
  return out
}

export function asTypeViewport(viewport?: string): TypeViewport {
  return viewport === 'mobile' ? 'mobile' : viewport === 'tablet' ? 'tablet' : 'desktop'
}

/** Primitive family / size / weight steps a platform cut actually aliases.
 *  Font primitives stay one ramp; this is which rungs each cut uses. */
export function typePrimitivesForViewport(
  stored: object | null | undefined,
  viewport: string,
): { families: Set<TypeFamilyRole>; sizes: Set<TypeScaleKey>; weights: Set<TypeWeightKey> } {
  const cut = asTypeViewport(viewport)
  const roles = mergeTypeRoles(stored)
  const families = new Set<TypeFamilyRole>()
  const sizes = new Set<TypeScaleKey>()
  const weights = new Set<TypeWeightKey>()
  for (const role of TYPE_ROLES) {
    const alias = roles[role.key]?.[cut] ?? role[cut]
    families.add(alias.family)
    sizes.add(alias.size)
    weights.add(alias.weight)
  }
  return { families, sizes, weights }
}

export function aliasesEqual(a: TypeAlias, b: TypeAlias): boolean {
  return a.family === b.family && a.size === b.size && a.weight === b.weight
}

export function roleIsDefault(key: string, modes: TypeRoleModes): boolean {
  const spec = TYPE_ROLE_BY_KEY[key]
  if (!spec) return true
  return aliasesEqual(modes.desktop, spec.desktop)
    && aliasesEqual(modes.tablet, spec.tablet)
    && aliasesEqual(modes.mobile, spec.mobile)
}

/** Pre-v75 mobile aliases for the two roles that now step TWO rungs on a
 *  phone. Display/Heading XL used to step only one. */
const LEGACY_LARGE_MOBILE: Record<string, TypeAlias> = {
  display: a('display', 'display-lg', 'bold'),
  'heading-xl': a('display', 'display-md', 'semibold'),
}

/** v81/v82: heading roles alias body family. Size and weight stay; family is
 *  the locked facet (the Variables table disables it for the same reason). */
export function migrateHeadingFamilyToBody(
  stored?: object | null,
): Record<string, TypeRoleModes> {
  return mergeTypeRoles(stored)
}

/** v75: move Display / Heading XL to their new two-rung mobile step when the
 *  stored pair is still the pre-v75 catalogue default, and seed tablet. A
 *  hand-picked mobile size is left alone (detect, don't assume). */
export function stepLargeTypeOnMobile(
  stored?: object | null,
): Record<string, TypeRoleModes> {
  const map = mergeTypeRoles(stored)
  for (const role of TYPE_ROLES) {
    const legacy = LEGACY_LARGE_MOBILE[role.key]
    if (!legacy) continue
    const hit = map[role.key]
    if (aliasesEqual(hit.desktop, role.desktop) && aliasesEqual(hit.mobile, legacy)) {
      map[role.key] = { ...hit, mobile: { ...role.mobile } }
    }
  }
  return map
}

/** Pre-v73 mobile aliases that shrunk body/control one step. Display/heading
 *  never used this path — they still step. */
const LEGACY_READING_MOBILE: Record<string, TypeAlias> = {
  'body-lg': a('body', 'text-md', 'regular'),
  'body-md': a('body', 'text-sm', 'regular'),
  'body-sm': a('body', 'text-xs', 'regular'),
  label: a('body', 'text-xs', 'medium'),
  placeholder: a('body', 'text-sm', 'regular'),
}

/** Lift stored body/control mobile aliases onto desktop when they still match
 *  the pre-v73 shrink. A hand-picked mobile size is left alone. */
export function promoteReadingTypeIdentity(
  stored?: object | null,
): Record<string, TypeRoleModes> {
  const map = mergeTypeRoles(stored)
  for (const role of TYPE_ROLES) {
    if (role.group !== 'body' && role.group !== 'control') continue
    const legacy = LEGACY_READING_MOBILE[role.key]
    if (!legacy) continue
    const hit = map[role.key]
    if (aliasesEqual(hit.desktop, role.desktop) && aliasesEqual(hit.mobile, legacy)) {
      map[role.key] = { ...hit, mobile: { ...hit.desktop } }
    }
  }
  return map
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
  opts: { viewport?: string; leading?: boolean } = {},
): { family: string; size: string; weight: number; lineHeight?: string } {
  const viewport = asTypeViewport(opts.viewport)
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

/** CSS custom property stem — `text-label` → `--text-label-font-size`,
 *  `-tablet` / `-mobile` suffixed for the other two cuts. */
export function typeRoleVar(key: string, facet: TypeFacet, viewport: TypeViewport = 'desktop'): string {
  const suffix =
    facet === 'family' ? 'font-family'
    : facet === 'size' ? 'font-size'
    : facet === 'weight' ? 'font-weight'
    : 'line-height'
  const base = `--text-${key}-${suffix}`
  return viewport === 'desktop' ? base : `${base}-${viewport}`
}

export function primitiveVar(alias: TypeAlias, facet: TypeFacet): string {
  if (facet === 'family') return `var(--font-family-${alias.family === 'display' ? 'heading' : 'body'})`
  if (facet === 'size') return `var(--font-size-${alias.size})`
  if (facet === 'weight') return `var(--font-weight-${alias.weight})`
  return `var(--line-height-${alias.size})`
}

const FACETS: TypeFacet[] = ['family', 'size', 'weight', 'leading']

/** Desktop + `-tablet` + `-mobile` alias declarations. Safe inside `:root`.
 *  Pass `['desktop']` when the file is the Free cut (Desktop only). Omitted,
 *  every viewport ships — the output every existing caller already has. */
export function typeRoleCssVars(
  roles?: object | null,
  viewports: readonly ('desktop' | 'tablet' | 'mobile')[] = ['desktop', 'tablet', 'mobile'],
): string[] {
  const map = mergeTypeRoles(roles)
  const lines: string[] = []
  for (const role of TYPE_ROLES) {
    const m = map[role.key]
    for (const facet of FACETS) {
      if (viewports.includes('desktop')) lines.push(`${typeRoleVar(role.key, facet)}: ${primitiveVar(m.desktop, facet)};`)
      if (viewports.includes('tablet')) lines.push(`${typeRoleVar(role.key, facet, 'tablet')}: ${primitiveVar(m.tablet, facet)};`)
      if (viewports.includes('mobile')) lines.push(`${typeRoleVar(role.key, facet, 'mobile')}: ${primitiveVar(m.mobile, facet)};`)
    }
  }
  return lines
}
