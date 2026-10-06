// Layout tokens — Radius · Spacing · Size · Selector · Stroke · Breakpoint.
// Same contract as typeRoles.ts: primitives are the scale (raw px). Semantics
// are intent aliases that ONLY reference a primitive key — never a new px.
//
// Naming (CSS / Figma / JSON), one convention:
//   primitive  `{family}-{step}`     --radius-2xl, --spacing-5, --breakpoint-md
//   semantic   `{family}-{intent}`   --radius-action: var(--radius-2xl)
//                                   --breakpoint-mobile: calc(var(--breakpoint-sm) - 1px)
// Family prefixes stay identical so a consumer never has to guess `space-` vs
// `spacing-`. Steps are the public scale names (xs/sm/md… and 0/1/2/3/4/5…).

import { dimensionFromKey, dimensionKey, parseDimension } from './dimensionCore'

export type LayoutFamily = 'radius' | 'spacing' | 'size' | 'selector' | 'stroke' | 'breakpoint'

// ── What a role (or a Grid frame field) can hold ────────────────────────────
// A role is a semantic token, and a semantic token points at a PRIMITIVE — in
// colour a ramp tone, here a Dimension primitive. Two spellings exist:
//
//   `lg`            a STEP of the family's scale (what every role stored before
//                   Dimension primitives, and what an untouched role still
//                   holds). It follows the ramp: regrade the ramp and it moves.
//   `dimension-16`  a Dimension primitive, picked in the editor. Pinned: the ramp
//                   can change underneath it and it stays 16px.
//
// Exports resolve BOTH to the primitive (`--radius-container:
// var(--dimension-16)`), so what ships is "semantic → primitive" either way.
// Existing systems need no migration: a step is still valid and still resolves.
export const ROLE_DIMENSION_PREFIX = 'dimension-'

/** `dimension-16` → 16, `dimension-3_5` → 3.5; anything else (a step name,
 *  `none`, a negative or malformed key) → null.
 *
 *  `signed` also accepts `dimension--8` → -8. Overlap is the one length that is
 *  legitimately negative, and only SPACING roles may hold it — so signed is
 *  opt-in at the spacing call sites, and a Grid margin or a Radius that arrives
 *  as `dimension--2` is still rejected as malformed. */
export function roleDimensionPx(value: unknown, signed = false): number | null {
  if (typeof value !== 'string' || !value.startsWith(ROLE_DIMENSION_PREFIX)) return null
  const key = value.slice(ROLE_DIMENSION_PREFIX.length)
  const n = dimensionFromKey(key)
  return Number.isFinite(n) && (signed || n >= 0) && dimensionKey(n) === key ? n : null
}

/** The role value that pins a Dimension primitive. */
export function dimensionRoleValue(px: number): string {
  return `${ROLE_DIMENSION_PREFIX}${dimensionKey(px)}`
}

/** The px a role value resolves to: a pinned primitive, or a step looked up in
 *  the family's scale. `null` when neither resolves. */
export function roleValuePx(value: string | undefined, steps: Record<string, string> | undefined): number | null {
  if (value === undefined) return null
  // A responsive spacing reference (`component-md`) reads its Desktop step.
  const step = spacingRefStep(value)
  return roleDimensionPx(step, true) ?? parseDimension(steps?.[step])
}

// ── Responsive spacing (Desktop · Tablet · Mobile) ──────────────────────────
// Three families of six sizes, each REFERENCING a static step (never a value):
//
//   Component — padding and gaps inside one component; subtle, tighter on mobile.
//   Section   — rhythm between blocks of a page.
//   Layout    — breathing room between page regions (header, sidebar, content).
//
// At the default 4px base, Desktop / Tablet / Mobile px (Spacing reference):
//   component  xl 24/16/12 · lg 16/16/12 · md 12/12/8 · sm 8/8/8 · xs 4/4/4
//   section    xl 48/32/20 · lg 32/20/16 · md 24/16/12 · sm 16/16/12 · xs 12/12/8
//   layout     xl 128/64/48 · lg 96/48/32 · md 64/32/16 · sm 48/24/12 · xs 32/16/8
//   (every family's `none` is 0)
// A spacing ROLE may point at one of these (`component-md`) and then steps down
// with it; a role on a static step or a pinned primitive holds one value.

export const SPACING_RESPONSIVE_FAMILIES = ['component', 'section', 'layout'] as const
export type SpacingResponsiveFamily = (typeof SPACING_RESPONSIVE_FAMILIES)[number]
export const SPACING_RESPONSIVE_SIZES = ['xl', 'lg', 'md', 'sm', 'xs', 'none'] as const
export type SpacingResponsiveSize = (typeof SPACING_RESPONSIVE_SIZES)[number]

const SR = (d: string, t: string, m: string) => ({ desktop: d, tablet: t, mobile: m })
const SPACING_RESPONSIVE_TABLE: Record<SpacingResponsiveFamily, Record<SpacingResponsiveSize, Record<GridViewport, string>>> = {
  component: { xl: SR('6', '4', '3'), lg: SR('4', '4', '3'), md: SR('3', '3', '2'), sm: SR('2', '2', '2'), xs: SR('1', '1', '1'), none: SR('0', '0', '0') },
  section: { xl: SR('12', '8', '5'), lg: SR('8', '5', '4'), md: SR('6', '4', '3'), sm: SR('4', '4', '3'), xs: SR('3', '3', '2'), none: SR('0', '0', '0') },
  layout: { xl: SR('32', '16', '12'), lg: SR('24', '12', '8'), md: SR('16', '8', '4'), sm: SR('12', '6', '3'), xs: SR('8', '4', '2'), none: SR('0', '0', '0') },
}

/** `component-md` → its Desktop / Tablet / Mobile static steps. 18 tokens. */
export const SPACING_RESPONSIVE: Record<string, Record<GridViewport, string>> = Object.fromEntries(
  SPACING_RESPONSIVE_FAMILIES.flatMap((family) =>
    SPACING_RESPONSIVE_SIZES.map((size) => [`${family}-${size}`, SPACING_RESPONSIVE_TABLE[family][size]])),
)
export const SPACING_RESPONSIVE_KEYS = Object.keys(SPACING_RESPONSIVE)

export function isSpacingResponsiveRef(value: unknown): value is string {
  return typeof value === 'string' && value in SPACING_RESPONSIVE
}

/** The static step a spacing value reads at a viewport: a responsive
 *  reference resolves through its table; anything else is returned as is. */
export function spacingRefStep(value: string, viewport: GridViewport = 'desktop'): string {
  return isSpacingResponsiveRef(value) ? SPACING_RESPONSIVE[value][viewport] : value
}

/** Every spacing role read at one viewport (responsive refs → static steps). */
export function spacingRolesAtViewport(roles: Record<string, string> | undefined, viewport: GridViewport): Record<string, string> {
  const merged = mergeLayoutRoles('spacing', roles)
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, spacingRefStep(v, viewport)]))
}

/** The spacing roles that point at responsive token `key`. */
export function rolesUsingSpacingToken(roles: Record<string, string> | undefined, key: string): string[] {
  const merged = mergeLayoutRoles('spacing', roles)
  return LAYOUT_ROLES.spacing.filter((r) => merged[r.key] === key).map((r) => r.key)
}

/** The 18 responsive tokens as CSS: `--spacing-component-md` references the
 *  static `--spacing-<step>`, so a theme that redefines the ramp needs no block
 *  of its own. Desktop on `:root`; Tablet / Mobile override what steps down. */
export function spacingResponsiveCss(viewport: GridViewport = 'desktop'): string[] {
  return SPACING_RESPONSIVE_KEYS
    .filter((key) => viewport === 'desktop' || SPACING_RESPONSIVE[key][viewport] !== SPACING_RESPONSIVE[key].desktop)
    .map((key) => `--spacing-${key}: var(--spacing-${SPACING_RESPONSIVE[key][viewport]});`)
}

/** `--spacing-<role>` overrides for one smaller viewport — only the roles on a
 *  responsive token whose step changes there. */
export function spacingRolesViewportCss(
  viewport: GridViewport,
  roles: Record<string, string> | undefined,
  spacing: Record<string, string> | undefined,
): string[] {
  const merged = mergeLayoutRoles('spacing', roles)
  const out: string[] = []
  for (const role of LAYOUT_ROLES.spacing) {
    const value = merged[role.key]
    if (!isSpacingResponsiveRef(value)) continue
    const step = spacingRefStep(value, viewport)
    if (step === spacingRefStep(value)) continue
    out.push(`--spacing-${role.key}: ${layoutValueCss('spacing', step, spacing)};`)
  }
  return out
}

// ── Radius primitives ───────────────────────────────────────────────────────
// Tailwind / HeroUI model: one base (`lg` = `--radius`) and named steps as
// fixed ratios of it. Values at the default 8px base are the published table
// (xs 2 · sm 4 · md 6 · lg 8 · xl 12 · 2xl 16 · 3xl 24 · 4xl 32 · 5xl 48) —
// Tailwind v4's scale plus a 5xl for the largest sheets. Store v77 moved every
// system onto these names (the ramp used to be graded from lg 16, i.e. every
// name sat two rungs higher) without moving a single resolved pixel.
// `2.5xl` is NOT a step — neither Tailwind nor HeroUI ships it.

export const RADIUS_WORKING_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const
export type RadiusWorkingStep = (typeof RADIUS_WORKING_STEPS)[number]

export const RADIUS_SCALE_RATIOS: Record<RadiusWorkingStep, number> = {
  xs: 0.25,
  sm: 0.5,
  md: 0.75,
  lg: 1,
  xl: 1.5,
  '2xl': 2,
  '3xl': 3,
  '4xl': 4,
  '5xl': 6,
}

export const RADIUS_STEPS = ['none', ...RADIUS_WORKING_STEPS, 'full'] as const
export type RadiusStep = (typeof RADIUS_STEPS)[number]

/** HeroUI / Tailwind `--radius` default: 0.5rem = 8px. */
export const RADIUS_DEFAULT_LG = 8

/** Grade the whole ramp from `lg`. Ratios are Tailwind/HeroUI, not a hand-tuned personality. */
export function scaleRadiusFromLg(lg: number, current?: Record<string, string>): Record<string, string> {
  const clamp = (n: number) => `${Math.max(0, Math.round(n))}px`
  const next: Record<string, string> = { ...current, none: '0px', full: '9999px' }
  for (const step of RADIUS_WORKING_STEPS) next[step] = clamp(lg * RADIUS_SCALE_RATIOS[step])
  return next
}

// ── Concentric nesting ──────────────────────────────────────────────────────
// What makes a radius read as ORGANIC is not its value, it is that nested
// curves are CONCENTRIC: the inner radius equals the outer one minus the
// padding between them, so the two arcs stay parallel. Break it and the corner
// looks wrong even though every number in the table is defensible on its own.
//
// The ratio ladder above never encoded that relation — `radius.control` was a
// fixed alias (`sm`), so it only satisfied the rule at ONE point on the
// roundness slider, and by coincidence. Measured against `inset-control` (12px
// at the default 4px spacing base):
//
//   preset   lg   action(2xl)   required = action − 12   control(sm)   delta
//   Sharp     8        16                4                    4          0
//   Soft     12        24               12                    6         -6
//   Rounded  16        32               20                    8        -12
//   Pill     24        48               36                   12        -24
//
// A second pair fails at the DEFAULT, not just off it: a card (`container`,
// 24) sitting flush inside a modal (`overlay`, 32) with `inset-surface` 20
// requires 12 and gets 24 — the inner arc extends past where the outer one
// allows, which is the visible corner collision.

/** The largest radius an element flush inside `outer` may take, given the
 *  padding between them. Never negative: at or past the padding the inner
 *  corner is square. */
export function nestedRadius(outer: number, inset: number): number {
  return Math.max(0, outer - inset)
}

/**
 * The primitive STEP a nested role should alias — the roundest step that does
 * not exceed `nestedRadius`. Returns a step key, never a raw px, so the
 * "semantics only ever reference a primitive" contract in this file's header
 * holds: what is derived is WHICH primitive, not a new value.
 *
 * Falling back DOWN (roundest step ≤ the limit) rather than to the nearest is
 * deliberate. Undershooting reads as a slightly tighter inner corner — fine,
 * and common. Overshooting is the collision this exists to prevent, so the
 * search may never land above the limit.
 */
export function concentricRadiusStep(
  radius: Record<string, string>,
  outerStep: string,
  insetPx: number,
): RadiusStep {
  const px = (step: string) => parseFloat(radius[step] ?? '') || 0
  const limit = nestedRadius(px(outerStep), insetPx)
  let best: RadiusStep = 'none'
  for (const step of RADIUS_WORKING_STEPS) {
    if (px(step) <= limit && px(step) >= px(best)) best = step
  }
  return best
}

/** The flush-nesting pairs this system actually contains. A pair belongs here
 *  only when the inner element sits against the outer one's inner edge — a
 *  chip inside a field, a card filling a modal body. A button floating in the
 *  middle of a card is not nested in this sense and has no constraint. */
export const RADIUS_NESTING: { inner: string; outer: string; inset: string; note: string }[] = [
  { inner: 'control', outer: 'action', inset: 'inset-control', note: 'Chip, icon button or checkbox inside a field.' },
  { inner: 'container', outer: 'overlay', inset: 'inset-surface', note: 'Card filling a modal or popover body.' },
]

export interface RadiusNestingCheck {
  inner: string
  outer: string
  /** Resolved px for the inner role as currently aliased. */
  innerPx: number
  /** The most the inner role may be: outer − inset. */
  limitPx: number
  inset: string
  insetPx: number
  note: string
  /** Only an inner radius ABOVE the limit breaks the corner. Below it merely
   *  reads a touch tighter, which is a look, not a defect. */
  broken: boolean
}

/** Report every nesting pair against the current ramps. Pure — hand it the
 *  resolved maps and it tells you which corners collide. */
export function radiusNestingReport(
  radius: Record<string, string>,
  radiusRoles: Record<string, string> | undefined,
  spacing: Record<string, string>,
  spacingRoles: Record<string, string> | undefined,
): RadiusNestingCheck[] {
  const radiusPx = (role: string) => parseFloat(resolveLayoutRole('radius', radiusRoles, radius, role, '0px')) || 0
  const spacingPx = (role: string) => parseFloat(resolveLayoutRole('spacing', spacingRoles, spacing, role, '0px')) || 0
  return RADIUS_NESTING.map(({ inner, outer, inset, note }) => {
    const innerPx = radiusPx(inner)
    const insetPx = spacingPx(inset)
    const limitPx = nestedRadius(radiusPx(outer), insetPx)
    return { inner, outer, innerPx, limitPx, inset, insetPx, note, broken: innerPx > limitPx }
  })
}

/** True when every nesting pair clears. A theme generator should reject
 *  (or re-roll) picks this flags — the editor reports collisions and does
 *  not steer them. */
export function radiusNestingOk(
  radius: Record<string, string>,
  radiusRoles: Record<string, string> | undefined,
  spacing: Record<string, string>,
  spacingRoles: Record<string, string> | undefined,
): boolean {
  return !radiusNestingReport(radius, radiusRoles, spacing, spacingRoles).some((check) => check.broken)
}

/**
 * Re-derive the nested radius roles after the ramp is regraded, so moving the
 * roundness slider keeps the corners concentric instead of breaking them.
 *
 * Only `control` actually tracks, and that asymmetry is the point rather than
 * an omission. `control ⊂ action` is a genuinely DERIVED value — nothing else
 * decides what a chip inside a field should be. `container ⊂ overlay` is not:
 * `radius.container` is every card's radius system-wide, so constraining it to
 * fit a modal's padding would flatten cards that are nowhere near a modal. That
 * pair is a composition tension for the designer to resolve (round the modal
 * less, or accept a tighter inner card) — `radiusNestingReport` surfaces it,
 * this does not silently "fix" it.
 *
 * A role is only re-derived when it still equals what the rule produced for the
 * PREVIOUS ramp — the same detect-don't-assume discipline the v47/v49 store
 * migrations use. Hand-pick a step and it stays picked; the rule stops steering
 * a value someone chose on purpose.
 */
export function concentricRadiusRoles(
  prevRadius: Record<string, string>,
  nextRadius: Record<string, string>,
  roles: Record<string, string> | undefined,
  spacing: Record<string, string>,
  spacingRoles?: Record<string, string>,
): Record<string, string> {
  const out = mergeLayoutRoles('radius', roles)
  for (const { inner, outer, inset } of RADIUS_NESTING) {
    if (inner !== 'control') continue
    const insetPx = parseFloat(resolveLayoutRole('spacing', spacingRoles, spacing, inset, '0px')) || 0
    if (out[inner] !== concentricRadiusStep(prevRadius, out[outer], insetPx)) continue
    out[inner] = concentricRadiusStep(nextRadius, out[outer], insetPx)
  }
  return out
}

function radiusPreset(
  label: string,
  description: string,
  lg: number,
): { label: string; description: string; values: Record<RadiusStep, string> } {
  return { label, description, values: scaleRadiusFromLg(lg) as Record<RadiusStep, string> }
}

export const RADIUS_PRESETS: { label: string; description: string; values: Record<RadiusStep, string> }[] = [
  radiusPreset('Sharp', 'lg 4px — tight, technical', 4),
  radiusPreset('Soft', 'lg 6px — slightly softer controls', 6),
  radiusPreset('Rounded', 'lg 8px — Tailwind / HeroUI default', 8),
  radiusPreset('Pill', 'lg 12px — generous, consumer apps', 12),
]

/**
 * System standard = Rounded (lg 8): none 0 · xs 2 · sm 4 · md 6 · lg 8 · xl 12
 * · 2xl 16 · 3xl 24 · 4xl 32 · 5xl 48 · full 9999 — the Corner Radius table.
 * The same pixels the pre-v77 lg-16 ramp carried, under the names designers
 * already know from Tailwind.
 */
export const RADIUS_STANDARD: Record<RadiusStep, string> = RADIUS_PRESETS[2].values

/** Fill missing (or 0px) working steps from the current `lg` without rewriting hand-edited values. */
export function completeRadiusScale(current?: Record<string, string>): Record<string, string> {
  const parsed = parseFloat(current?.lg ?? '')
  const lg = Number.isFinite(parsed) && parsed > 0 ? parsed : RADIUS_DEFAULT_LG
  const graded = scaleRadiusFromLg(lg)
  const out: Record<string, string> = { ...graded }
  if (!current) return out
  for (const step of RADIUS_WORKING_STEPS) {
    const raw = current[step]
    const n = parseFloat(raw ?? '')
    if (Number.isFinite(n) && n > 0) out[step] = raw as string
  }
  out.none = current.none ?? '0px'
  out.full = current.full ?? '9999px'
  return out
}

export function matchRadiusPreset(radius: Record<string, string>): string | null {
  const hit = RADIUS_PRESETS.find((p) =>
    RADIUS_STEPS.every((s) => (radius[s] ?? '') === p.values[s]),
  )
  return hit?.label ?? null
}

// ── Spacing primitives ──────────────────────────────────────────────────────
// 4px grid (Tailwind / Untitled). A step is a MULTIPLIER of the base unit, so
// at the default 4px base the scale is the Spacing Scale reference — 0 · 2 · 4 ·
// 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96 · 128 — plus 40 (step 10),
// which Tailwind also ships. Half steps are keyed `0_5` / `1_5` / `2_5` (the
// same `_` rule as `dimension-3_5`): a `.` would split a Figma variable path
// and is not a valid CSS identifier character. Step 5 = 20px so surface inset
// can alias the padding the platform already shipped.

export const SPACING_STEPS = ['0', '0_5', '1', '1_5', '2', '2_5', '3', '4', '5', '6', '8', '10', '12', '16', '24', '32'] as const
export type SpacingStep = (typeof SPACING_STEPS)[number]

export const SPACING_BASE_PRESETS = [
  { label: '4px  (default)', value: 4 },
  { label: '8px  (spacious)', value: 8 },
  { label: '5px  (5-grid)', value: 5 },
] as const

export const SPACING_DEFAULT_BASE = 4

export function buildSpacingFromBase(base: number): Record<string, string> {
  const result: Record<string, string> = {}
  for (const step of SPACING_STEPS) {
    result[step] = `${Number(step.replace('_', '.')) * base}px`
  }
  return result
}

export const SPACING_STANDARD = buildSpacingFromBase(SPACING_DEFAULT_BASE)

/** Surface inset — four sides, each an alias of a spacing STEP (not raw px). */
export const PADDING_SIDES = ['top', 'right', 'bottom', 'left'] as const
export type PaddingSide = (typeof PADDING_SIDES)[number]
export const PADDING_DEFAULT_STEP: SpacingStep = '5'
export const PADDING_STANDARD: Record<PaddingSide, string> = {
  top: SPACING_STANDARD[PADDING_DEFAULT_STEP],
  right: SPACING_STANDARD[PADDING_DEFAULT_STEP],
  bottom: SPACING_STANDARD[PADDING_DEFAULT_STEP],
  left: SPACING_STANDARD[PADDING_DEFAULT_STEP],
}

/**
 * The semantic spacing role every boxed surface (Card, panel, alert, the
 * artefact collage) reads for its inner inset — `--spacing-inset-surface`.
 * `paddingOf` / `spacingRoleOf(t, 'inset-surface')` resolve THROUGH this, so
 * it, not the four-sided `padding` mirror, is what actually moves a container's
 * padding in the preview. The `padding` field trails it as a resolved-px copy
 * (see `insetSurfacePadding`).
 */
export const INSET_SURFACE_ROLE = 'inset-surface'

/** Slider index into `SPACING_STEPS` for the current surface inset (default
 *  step 5). A role pinned to a Dimension primitive (set in Variables) lands on
 *  the step with the same px, or the nearest one when the scale has none — pass
 *  the spacing scale for that. Malformed values fall back to step 5. */
export function insetSurfaceStepIndex(
  spacingRoles: Record<string, string> | undefined,
  spacing?: Record<string, string>,
): number {
  const step = spacingRefStep(spacingRoles?.[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP)
  const i = SPACING_STEPS.indexOf(step as SpacingStep)
  if (i !== -1) return i
  const pinned = roleDimensionPx(step)
  if (pinned !== null && spacing) {
    const near = nearestSpacingStep(spacing, pinned)
    if (near) return SPACING_STEPS.indexOf(near)
  }
  return SPACING_STEPS.indexOf(PADDING_DEFAULT_STEP)
}

/** The four-sided `padding` mirror for a given inset px — so the export's
 *  `--padding-*` vars stay in lockstep with `--spacing-inset-surface`. */
export function insetSurfacePadding(px: string): Record<PaddingSide, string> {
  return { top: px, right: px, bottom: px, left: px }
}

// ── Size primitives ─────────────────────────────────────────────────────────
// 8px control-height ramp. 44px (iOS HIG) is NOT a step — touch uses `lg` (48).

export const SIZE_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
export type SizeStep = (typeof SIZE_STEPS)[number]

export const SIZE_STANDARD: Record<SizeStep, string> = {
  xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '56px', '2xl': '64px',
}

/**
 * The ramp is `base × multiplier`, exactly like Spacing's — and the multipliers
 * below are not a new invention: 24/32/40/48/56/64 IS 4 × 6/8/10/12/14/16, so
 * `buildSizesFromBase(SIZE_DEFAULT_BASE)` reproduces SIZE_STANDARD byte for byte.
 * That's what makes the base-unit slider safe to add to an existing system.
 */
export const FIELD_MULTIPLIERS: Record<SizeStep, number> = {
  xs: 6, sm: 8, md: 10, lg: 12, xl: 14, '2xl': 16,
}
export const SIZE_DEFAULT_BASE = 4

/** Shared 3–5px range for both base units, per the sizing spec. */
export const BASE_UNIT_RANGE = { min: 3, max: 5, step: 0.5 } as const

export function buildSizesFromBase(base: number): Record<string, string> {
  const out: Record<string, string> = {}
  for (const step of SIZE_STEPS) out[step] = `${Math.round(base * FIELD_MULTIPLIERS[step])}px`
  return out
}

// ── Selector primitives ─────────────────────────────────────────────────────
// Checkbox / radio / toggle / badge — a SQUARE glyph, not a control height, so
// it needs its own ramp rather than borrowing Size's. At base 3 this yields
// 12/15/18/21/24, and 15/18 are the exact values the specimens hardcoded before
// this collection existed — so the default is a visual no-op.
//
// A selector below 24px does NOT meet WCAG 2.2 target size on its own; callers
// wrap it in a transparent hit area (`size` role `hit`, 24px). Growing the glyph
// is not the fix — the padded target is.

export const SELECTOR_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export type SelectorStep = (typeof SELECTOR_STEPS)[number]

export const SELECTOR_MULTIPLIERS: Record<SelectorStep, number> = {
  xs: 4, sm: 5, md: 6, lg: 7, xl: 8,
}
export const SELECTOR_DEFAULT_BASE = 3
/** Selector stays on a 3px base while Size and Spacing sit on 4. That is a
 *  declared ratio, not a drift: 15/18 were the hardcoded specimen values, so
 *  the default is a visual no-op. A generator that varies the size base should
 *  keep `selectorBase = sizeBase * SELECTOR_TO_SIZE_BASE` (then clamp to
 *  `BASE_UNIT_RANGE`) so checkboxes stay optically smaller than fields. */
export const SELECTOR_TO_SIZE_BASE = SELECTOR_DEFAULT_BASE / SIZE_DEFAULT_BASE

export function buildSelectorsFromBase(base: number): Record<string, string> {
  const out: Record<string, string> = {}
  for (const step of SELECTOR_STEPS) out[step] = `${Math.round(base * SELECTOR_MULTIPLIERS[step])}px`
  return out
}

export const SELECTOR_STANDARD = buildSelectorsFromBase(SELECTOR_DEFAULT_BASE)

/**
 * The base a ramp was generated from, or null when it was hand-edited into a
 * shape no base produces. Inferred rather than stored, the same call
 * `matchRadiusPreset` makes: a stored base can silently disagree with the ramp
 * beside it, an inferred one cannot. null surfaces as "Custom" in the UI.
 */
function inferBase(
  map: Record<string, string> | undefined,
  multipliers: Record<string, number>,
  steps: readonly string[],
): number | null {
  if (!map) return null
  const anchor = parseFloat(map[steps[0]] ?? '')
  if (!Number.isFinite(anchor)) return null
  const base = anchor / multipliers[steps[0]]
  if (!(base > 0)) return null
  for (const step of steps) {
    if (map[step] !== `${Math.round(base * multipliers[step])}px`) return null
  }
  return base
}

export const inferSizeBase = (sizes?: Record<string, string>) =>
  inferBase(sizes, FIELD_MULTIPLIERS, SIZE_STEPS)
export const inferSelectorBase = (map?: Record<string, string>) =>
  inferBase(map, SELECTOR_MULTIPLIERS, SELECTOR_STEPS)

// ── Stroke primitives (weight, not paint) ───────────────────────────────────
// Even grid. 3px leftovers snap onto this. WCAG 2.4.13 min ring = 2px.

export const STROKE_STEPS = ['none', 'sm', 'md', 'lg'] as const
export type StrokeStep = (typeof STROKE_STEPS)[number]

export const STROKE_STANDARD: Record<StrokeStep, string> = {
  none: '0px', sm: '1px', md: '2px', lg: '4px',
}

/**
 * The global border-width control drives `sm` and ONLY `sm`.
 *
 * `sm` is what both `stroke-divider` and `stroke-control` alias, so moving it
 * is what "all components" means. `md` is left alone deliberately: it backs
 * `stroke-focus`, and WCAG 2.4.13 puts a 2px floor under a focus indicator —
 * a global multiplier would drag the ring under it at the low end.
 */
export const STROKE_SM_STOPS = [0, 0.5, 1, 1.5, 2] as const

/**
 * A sub-pixel hairline only renders cleanly at 2dppx or better; at 1x the
 * browser rounds it to an artefact (or to nothing). Floor it to 1px there.
 * `dpr` is passed in rather than read off `window` so this stays pure — the
 * exported CSS makes the same call with a `min-resolution: 2dppx` media query.
 */
export function hairlineSafe(value: string, dpr: number): string {
  const px = parseFloat(value)
  if (!Number.isFinite(px) || px <= 0 || px >= 1 || dpr >= 2) return value
  return '1px'
}

// ── Breakpoint primitives ───────────────────────────────────────────────────
// Tailwind / Untitled min-widths. Semantics name the cut Type and Grid share:
// desktop = min-width of `md`; mobile = calc(that − 1px). Never a raw 767.

export const BREAKPOINT_STEPS = ['sm', 'md', 'lg', 'xl', '2xl'] as const
export type BreakpointStep = (typeof BREAKPOINT_STEPS)[number]

export const BREAKPOINT_STANDARD: Record<BreakpointStep, string> = {
  // 2xl is 1440, not Tailwind's 1536: it is the widest of the six named grid
  // styles (2XL Desktop and XL Desktop Sidebar both lay out on a 1440 frame).
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px',
}

export function breakpointKey(step: string): string {
  return `breakpoint-${step}`
}

export function extractBreakpoints(grid: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const step of BREAKPOINT_STEPS) {
    out[step] = grid?.[breakpointKey(step)] || BREAKPOINT_STANDARD[step]
  }
  return out
}

// ── Grid frame (desktop / tablet / mobile recipes) ──────────────────────────
// Columns are counts on a 12-col system. Gutter/margin alias spacing steps.
// Container aliases a breakpoint step, or `none` (no max-width).
//
// Three WINDOW recetas, not OS platforms: compact phone · tablet · desktop.
// Type roles have the same three columns since v75 (only Display and
// headings step; see typeRoles.ts). Grid's middle recipe is 4 / 8 / 12 columns.

export const GRID_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
export type GridViewport = (typeof GRID_VIEWPORTS)[number]

export const GRID_COLUMN_STEPS = ['2', '4', '8', '12'] as const
export type GridColumnStep = (typeof GRID_COLUMN_STEPS)[number]

export const GRID_CONTAINER_STEPS = ['none', ...BREAKPOINT_STEPS] as const
export type GridContainerStep = (typeof GRID_CONTAINER_STEPS)[number]

export interface GridFrameAlias {
  columns: string
  gutter: string
  margin: string
  container: string
}

export type GridFrameModes = Record<GridViewport, GridFrameAlias>

export const GRID_FRAME_FIELDS: { key: keyof GridFrameAlias; label: string; description: string }[] = [
  { key: 'columns', label: 'Columns', description: 'Tracks in the layout grid.' },
  { key: 'gutter', label: 'Gutter', description: 'Gap between columns — a spacing step.' },
  { key: 'margin', label: 'Margin', description: 'Page inset below the container cap — a spacing step.' },
  { key: 'container', label: 'Container', description: 'Max content width — a breakpoint step, or none.' },
]

/** The three Dimension Semantics modes ARE three of the six named grid
 *  styles below: Desktop = XL Desktop (12 × 72 on 1280, gutter 32, margin 32),
 *  Tablet = MD Tablet (8 × 60 on 768, 32 / 32), Mobile = SM Mobile (4 × 60 on
 *  320, 16 / 16). Gutters hold 32 from tablet up; only the phone tightens. */
export const GRID_FRAME_STANDARD: GridFrameModes = {
  desktop: { columns: '12', gutter: '8', margin: '8', container: 'xl' },
  tablet: { columns: '8', gutter: '8', margin: '8', container: 'none' },
  mobile: { columns: '4', gutter: '4', margin: '4', container: 'none' },
}

/** What GRID_FRAME_STANDARD was before the six-style grid (store < v76). The
 *  migration replaces a viewport only while it still holds exactly this. */
export const GRID_FRAME_LEGACY_STANDARD: GridFrameModes = {
  desktop: { columns: '12', gutter: '6', margin: '8', container: 'xl' },
  tablet: { columns: '8', gutter: '6', margin: '6', container: 'none' },
  mobile: { columns: '4', gutter: '4', margin: '4', container: 'none' },
}

// ── Named grid styles (what a designer applies to a frame in Figma) ─────────
// Six layouts, one per breakpoint and content context. Columns are FIXED width
// and centred, so on a frame of the style's own width the margins land exactly
// and every number on the spec sheet is the number in the file:
//
//   SM Mobile           4 × 60  · gutter 16 · margin 16 →  320
//   MD Tablet           8 × 60  · gutter 32 · margin 32 →  768
//   LG Web             12 × 48  · gutter 32 · margin 48 → 1024
//   XL Desktop         12 × 72  · gutter 32 · margin 32 → 1280
//   XL Desktop Sidebar 344 + 12 × 64 · gutter 24 · margin 32 → 1440
//   2XL Desktop        12 × 80  · gutter 32 · margin 64 → 1440
//
// The column width is DERIVED — (width − sidebar − 2·margin − (n−1)·gutter) / n
// — never stored, so editing a gutter re-solves the column instead of the
// frame silently no longer adding up. SM · MD · XL read the editable viewport
// frames above (they are the Figma modes); LG · 2XL inherit Desktop's columns
// and gutter and pin only the margin that makes them theirs, and the sidebar
// layout pins its own tighter gutter and the 344 rail.

export const GRID_STYLE_KEYS = ['2xl-desktop', 'xl-desktop', 'xl-desktop-sidebar', 'lg-web', 'md-tablet', 'sm-mobile'] as const
export type GridStyleKey = (typeof GRID_STYLE_KEYS)[number]

export interface GridStyleDef {
  key: GridStyleKey
  label: string
  description: string
  /** The viewport this style belongs to — it ships only when that viewport does. */
  viewport: GridViewport
  /** Overrides on top of `gridFrame[viewport]` (pinned primitives). */
  recipe?: Partial<Pick<GridFrameAlias, 'gutter' | 'margin'>>
  /** The frame the style is laid out on: a breakpoint step, a pinned
   *  primitive, or `container` (the desktop frame's own cap). */
  width: string
  /** A fixed-width rail on the left, before the margin. */
  sidebar?: string
}

export const GRID_STYLES: readonly GridStyleDef[] = [
  { key: '2xl-desktop', label: '2XL Desktop', viewport: 'desktop', width: '2xl', recipe: { margin: 'dimension-64' },
    description: 'Full-width desktop without a sidebar. Wider columns let content scale on large screens.' },
  { key: 'xl-desktop', label: 'XL Desktop', viewport: 'desktop', width: 'container',
    description: 'Standard desktop layouts, balancing content density and readability.' },
  { key: 'xl-desktop-sidebar', label: 'XL Desktop Sidebar', viewport: 'desktop', width: '2xl', sidebar: 'dimension-344', recipe: { gutter: 'dimension-24' },
    description: 'Desktop with a persistent left sidebar; the content area keeps its own 12 columns.' },
  { key: 'lg-web', label: 'LG Web', viewport: 'desktop', width: 'lg', recipe: { margin: 'dimension-48' },
    description: 'Smaller desktop and large tablet web. Narrower columns keep focus on limited width.' },
  { key: 'md-tablet', label: 'MD Tablet', viewport: 'tablet', width: 'md',
    description: 'Tablet, where touch and content clarity matter equally. Desktop structure, tablet spacing.' },
  { key: 'sm-mobile', label: 'SM Mobile', viewport: 'mobile', width: 'dimension-320',
    description: 'Mobile-first, limited horizontal space: wide columns and tight gutters.' },
]

export interface ResolvedGridStyle {
  key: GridStyleKey
  label: string
  description: string
  viewport: GridViewport
  columns: number
  /** Derived fixed column width, px. */
  column: number
  gutter: number
  margin: number
  /** The frame width the style adds up to, px. */
  width: number
  sidebar?: number
}

/** Every named grid style, resolved to px against the system's own frames. */
export function resolveGridStyles(
  frame: GridFrameModes | undefined,
  spacing: Record<string, string>,
  breakpoints: Record<string, string>,
): ResolvedGridStyle[] {
  const merged = mergeGridFrame(frame)
  const px = (v: string | undefined) => {
    if (!v) return 0
    const pinned = roleDimensionPx(v)
    if (pinned !== null) return pinned
    return parseFloat(spacing[v] || SPACING_STANDARD[v as SpacingStep] || '0') || 0
  }
  const bp = (v: string) => roleDimensionPx(v) ?? (parseFloat(breakpoints[v] || BREAKPOINT_STANDARD[v as BreakpointStep] || '0') || 0)
  return GRID_STYLES.map((def) => {
    const base = merged[def.viewport]
    const columns = Math.max(1, parseInt(base.columns, 10) || 12)
    const gutter = px(def.recipe?.gutter ?? base.gutter)
    const margin = px(def.recipe?.margin ?? base.margin)
    const sidebar = def.sidebar ? (roleDimensionPx(def.sidebar) ?? 0) : 0
    const container = merged.desktop.container
    const width = def.width === 'container'
      ? (container !== 'none' ? bp(container) : 0) || bp('xl')
      : bp(def.width)
    const column = Math.max(1, Math.round(((width - sidebar - 2 * margin - (columns - 1) * gutter) / columns) * 100) / 100)
    return {
      key: def.key, label: def.label, description: def.description, viewport: def.viewport,
      columns, column, gutter, margin, width, ...(sidebar ? { sidebar } : {}),
    }
  })
}

/** The standard frame, keeping each field on a spacing STEP where that step
 *  still lands on the standard px, and PINNING the standard primitive where it
 *  doesn't. A style built on a 3.5 / 4.5 / 5px spacing base would otherwise
 *  drag its gutters and margins off the 4px grid (21 · 27 · 30px) and under
 *  the 16px phone margin — the frame is a layout standard (4 / 8 / 12
 *  columns, gutters 16 / 32 / 32, margins 16 / 32 / 32), not a property of
 *  the spacing base. */
export function standardGridFrameFor(spacing: Record<string, string>): GridFrameModes {
  const out = {} as GridFrameModes
  for (const vp of GRID_VIEWPORTS) {
    const alias = GRID_FRAME_STANDARD[vp]
    const keep = (step: string) => {
      const want = parseFloat(SPACING_STANDARD[step as SpacingStep])
      return parseFloat(spacing[step]) === want ? step : dimensionRoleValue(want)
    }
    out[vp] = { ...alias, gutter: keep(alias.gutter), margin: keep(alias.margin) }
  }
  return out
}

/** Store v76: move a slot (the root state, a theme's foundations, a saved
 *  snapshot) onto the six-style grid. A viewport moves only while it still
 *  holds exactly the pre-v76 default, and 2xl only while it is still 1536 —
 *  a hand-set value stays. Mutates `slot`. */
export function restandardGrid(
  slot: { grid?: Record<string, string>; gridFrame?: GridFrameModes } | null | undefined,
  spacing: Record<string, string> | undefined,
): void {
  if (!slot || typeof slot !== 'object') return
  if (slot.grid && typeof slot.grid === 'object' && slot.grid['breakpoint-2xl'] === '1536px') {
    slot.grid = { ...slot.grid, 'breakpoint-2xl': BREAKPOINT_STANDARD['2xl'] }
  }
  if (!slot.gridFrame || typeof slot.gridFrame !== 'object') return
  const same = (a: GridFrameAlias | undefined, b: GridFrameAlias) =>
    !!a && a.columns === b.columns && a.gutter === b.gutter && a.margin === b.margin && a.container === b.container
  const next = standardGridFrameFor(spacing ?? SPACING_STANDARD)
  const stored = slot.gridFrame
  const frame = mergeGridFrame(stored)
  for (const vp of GRID_VIEWPORTS) {
    if (same(stored[vp], GRID_FRAME_LEGACY_STANDARD[vp])) frame[vp] = next[vp]
  }
  slot.gridFrame = frame
  if (slot.grid && typeof slot.grid === 'object' && spacing) {
    slot.grid = applyDesktopFrameToGrid(slot.grid, frame, spacing)
  }
}

export function mergeGridFrame(stored?: GridFrameModes | null): GridFrameModes {
  const one = (hit: GridFrameAlias | undefined, fallback: GridFrameAlias): GridFrameAlias => {
    const columns = hit?.columns && (GRID_COLUMN_STEPS as readonly string[]).includes(hit.columns) ? hit.columns : fallback.columns
    // A field holds a step of its scale, or a pinned Dimension primitive.
    const gutter = hit?.gutter && ((SPACING_STEPS as readonly string[]).includes(hit.gutter) || roleDimensionPx(hit.gutter) !== null) ? hit.gutter : fallback.gutter
    const margin = hit?.margin && ((SPACING_STEPS as readonly string[]).includes(hit.margin) || roleDimensionPx(hit.margin) !== null) ? hit.margin : fallback.margin
    const container = hit?.container && ((GRID_CONTAINER_STEPS as readonly string[]).includes(hit.container) || roleDimensionPx(hit.container) !== null) ? hit.container : fallback.container
    return { columns, gutter, margin, container }
  }
  return {
    desktop: one(stored?.desktop, GRID_FRAME_STANDARD.desktop),
    tablet: one(stored?.tablet, GRID_FRAME_STANDARD.tablet),
    mobile: one(stored?.mobile, GRID_FRAME_STANDARD.mobile),
  }
}

export interface ResolvedGridFrame {
  columns: number
  gutter: string
  margin: string
  container: string
}

export function resolveGridFrame(
  viewport: GridViewport,
  frame: GridFrameModes | undefined,
  spacing: Record<string, string>,
  breakpoints: Record<string, string>,
): ResolvedGridFrame {
  const alias = mergeGridFrame(frame)[viewport]
  const pinned = (v: string) => { const n = roleDimensionPx(v); return n === null ? null : `${n}px` }
  const container = alias.container === 'none'
    ? 'none'
    : (pinned(alias.container) ?? breakpoints[alias.container] ?? BREAKPOINT_STANDARD[alias.container as BreakpointStep] ?? 'none')
  return {
    columns: Math.max(1, parseInt(alias.columns, 10) || 12),
    gutter: pinned(alias.gutter) ?? (spacing[alias.gutter] || SPACING_STANDARD[alias.gutter as SpacingStep] || '24px'),
    margin: pinned(alias.margin) ?? (spacing[alias.margin] || SPACING_STANDARD[alias.margin as SpacingStep] || '32px'),
    container,
  }
}

/** Type roles only have desktop/mobile maps. Tablet uses the desktop aliases
 *  so body/control stay identity on the 8-col recipe too. */
export function typeViewportOf(platform: GridViewport | undefined): 'desktop' | 'mobile' {
  return platform === 'mobile' ? 'mobile' : 'desktop'
}

/** CSS px a desktop artefact frame lays out at — the grid container, or the
 *  desktop breakpoint when the container is `none`. Callers must not invent a
 *  laptop width; this is the same pair Grid Preview already names. */
export function desktopArtefactWidthPx(
  frame: ResolvedGridFrame,
  breakpoints: Record<string, string>,
  desktopStep = 'md',
): number {
  const container = parseFloat(frame.container)
  if (Number.isFinite(container) && container > 0) return container
  // The desktop cut may be a step or a pinned primitive.
  const min = roleDimensionPx(desktopStep) ?? parseFloat(
    breakpoints[desktopStep] || BREAKPOINT_STANDARD[desktopStep as BreakpointStep] || '768',
  )
  return Number.isFinite(min) && min > 0 ? min : 768
}

/** Store `grid` object: desktop-resolved frame + breakpoint primitives. */
export function buildGridStandard(
  spacing: Record<string, string> = SPACING_STANDARD,
  breakpoints: Record<string, string> = BREAKPOINT_STANDARD,
  frame: GridFrameModes = GRID_FRAME_STANDARD,
): Record<string, string> {
  const desktop = resolveGridFrame('desktop', frame, spacing, breakpoints)
  const out: Record<string, string> = {
    columns: String(desktop.columns),
    gutter: desktop.gutter,
    margin: desktop.margin,
    container: desktop.container,
  }
  for (const step of BREAKPOINT_STEPS) {
    out[breakpointKey(step)] = breakpoints[step] || BREAKPOINT_STANDARD[step]
  }
  return out
}

export const GRID_STANDARD = buildGridStandard()

export function applyDesktopFrameToGrid(
  grid: Record<string, string>,
  frame: GridFrameModes,
  spacing: Record<string, string>,
): Record<string, string> {
  const desktop = resolveGridFrame('desktop', frame, spacing, extractBreakpoints(grid))
  return {
    ...grid,
    columns: String(desktop.columns),
    gutter: desktop.gutter,
    margin: desktop.margin,
    container: desktop.container,
  }
}

// ── Semantic catalogues ─────────────────────────────────────────────────────

export interface LayoutRole {
  key: string
  label: string
  description: string
  group: string
  /** Primitive step this role aliases by default. */
  primitive: string
}

export const LAYOUT_ROLE_GROUPS: Record<LayoutFamily, { id: string; label: string; hint: string }[]> = {
  // The SAME three axes the quick rail exposes, so the two surfaces speak one
  // vocabulary — they already wrote one `radiusRoles` map, but the Variables
  // rail still said Control / Surface, which is a second way to describe the
  // same five roles. `pill` lives under Selectors: it is that family (badge,
  // avatar, switch) even though it is not an AXIS — it means "a circle", so the
  // rail never drives it and it stays editable here only.
  radius: [
    { id: 'boxes', label: 'Boxes', hint: 'Card, modal, alert.' },
    { id: 'fields', label: 'Fields', hint: 'Button, input, select, tab.' },
    { id: 'selectors', label: 'Selectors', hint: 'Checkbox, radio, toggle, menu, badge.' },
  ],
  spacing: [
    { id: 'gap', label: 'Gap', hint: 'Space between siblings.' },
    { id: 'inset', label: 'Inset', hint: 'Padding inside a surface or control.' },
    { id: 'overlap', label: 'Overlap', hint: 'Negative space — stacked avatars and badges.' },
  ],
  size: [
    { id: 'control', label: 'Control', hint: 'Default and density heights.' },
    { id: 'special', label: 'Special', hint: 'Hit areas and FABs.' },
  ],
  selector: [
    { id: 'glyph', label: 'Glyph', hint: 'The drawn box, dot or track.' },
  ],
  stroke: [
    { id: 'line', label: 'Line', hint: 'Border width and focus ring spread.' },
  ],
  breakpoint: [
    { id: 'viewport', label: 'Viewport', hint: 'Desktop min-width and mobile max-width cut.' },
  ],
}

/**
 * ── Why the roles sit on xs / lg / xl / 2xl and not sm / 2xl / 3xl / 4xl ─────
 *
 * They used to sit two rungs higher, and the reason was written down: "Roles
 * pick 2xl/3xl/4xl so the look matches the previous Rounded ramp." That is a
 * one-time VISUAL COMPENSATION — the standard ramp had moved down to Sharp
 * (lg 8) and the roles were pushed up to keep the old pixels — and encoding it
 * as a permanent offset on a MULTIPLICATIVE ladder is what broke.
 *
 * `scaleRadiusFromLg` grades every step as a ratio of `lg` (3xl = 3×, 4xl = 4×),
 * so the compensation is exact at lg 8 and amplifies everywhere else. Measured
 * across the shipped styles, three of which use the Pill preset (lg 24):
 *
 *   preset   lg   control  action  container  overlay
 *   Sharp     8      4       16       24        32     ← the one it was tuned for
 *   Soft     12      6       24       36        48
 *   Rounded  16      8       32       48        64
 *   Pill     24     12       48       72        96     ← a 72px CARD
 *
 * At 72px a card on a 156px collage module is 46% of its own width — a stadium,
 * not a corner, which is exactly the "corners extremadamente bordeadas"
 * reported. The ladder was also lopsided: control→action jumped 4×, then 1.5×,
 * then 1.33×.
 *
 * On the natural rungs the ladder is even and bounded, and `RADIUS_STANDARD`
 * moved to Rounded (lg 16) in the same change. Store v67 re-grades any existing
 * GRADED ramp `lg → 2×lg`, which is value-identical for all four roles at every
 * preset (see the test), and pins the old rungs on a hand-edited ramp rather
 * than reflowing it.
 *
 * The rungs BELOW then moved once more, and that second move is a deliberate
 * visual recalibration rather than a no-op: `action` sm, `container` /
 * `overlay` lg. Two reasons. The steps now sit on `RADIUS_GROUP_STEPS`, so each
 * axis default is reachable from its own picker instead of reading "Custom" out
 * of the box. And the resolved ladder becomes **selectors 4 · fields 8 ·
 * boxes 16** — strictly increasing, with the box no longer the roundest thing
 * on screen by a factor of four. `overlay` collapses onto `container` because
 * DaisyUI has ONE `--radius-box` for card and modal alike; the role is kept so
 * the export contract does not change.
 */
export const RADIUS_ROLES: LayoutRole[] = [
  { key: 'control', label: 'Control', description: 'Checkbox, nested child, menu item, inner thumb.', group: 'selectors', primitive: 'sm' },
  { key: 'action', label: 'Action', description: 'Buttons, inputs, selects, OTP, tabs.', group: 'fields', primitive: 'lg' },
  { key: 'container', label: 'Container', description: 'Cards, accordion, inline alerts.', group: 'boxes', primitive: '2xl' },
  { key: 'overlay', label: 'Overlay', description: 'Modal, popover, command, dropdown.', group: 'boxes', primitive: '2xl' },
  { key: 'pill', label: 'Pill', description: 'Badge, chip, avatar, switch, progress.', group: 'selectors', primitive: 'full' },
]

/**
 * ── The three independent radius axes (DaisyUI's model) ─────────────────────
 *
 * One roundness control that graded the whole ramp coupled every surface to
 * every control: picking "Pill" made the CARD a stadium too, which is unreadable
 * and was the reported defect. Rounding a checkbox and rounding a modal are not
 * the same decision and must not share a dial.
 *
 * DaisyUI 5 splits it into `--radius-box` (card, modal, alert),
 * `--radius-field` (button, input, select, tab) and `--radius-selector`
 * (checkbox, toggle, badge), each set independently per theme. These groups are
 * that split, expressed over the roles this system already has — so the token
 * contract is unchanged and only WHICH step each role aliases is now chosen per
 * axis instead of derived from a single `lg`.
 *
 * `RADIUS_GROUP_STEPS` is DaisyUI's own ladder: at the standard ramp these are
 * 0 / 4 / 8 / 16 / 32px, i.e. 0, 0.25rem, 0.5rem, 1rem, 2rem exactly
 * (none · sm · lg · 2xl · 4xl since v77 renamed the ramp; same pixels).
 *
 * `pill` is deliberately NOT an axis. It means "this is a circle" (avatar,
 * progress, switch track) rather than "this is somewhat rounded", so it stays
 * `full`; putting it under Selectors would square off avatars the moment
 * someone picked a tighter checkbox. That is the one place these groups diverge
 * from DaisyUI, whose selector axis also covers the badge.
 */
export const RADIUS_GROUP_STEPS = ['none', 'sm', 'lg', '2xl', '4xl'] as const
export type RadiusGroupStep = (typeof RADIUS_GROUP_STEPS)[number]

export interface RadiusGroup {
  key: string
  label: string
  hint: string
  /** Every role this axis drives. All of them take the same step. */
  roles: string[]
}

export const RADIUS_GROUPS: RadiusGroup[] = [
  { key: 'boxes', label: 'Boxes', hint: 'card, modal, alert', roles: ['container', 'overlay'] },
  { key: 'fields', label: 'Fields', hint: 'button, input, select, tab', roles: ['action'] },
  { key: 'selectors', label: 'Selectors', hint: 'checkbox, radio, toggle, menu', roles: ['control'] },
]

/** The step an axis is currently on, or `null` when its roles disagree or sit
 *  on a step outside the ladder — a hand-picked alias, shown as Custom. */
export function radiusGroupStep(
  group: RadiusGroup,
  roles: Record<string, string> | undefined,
): RadiusGroupStep | null {
  const merged = mergeLayoutRoles('radius', roles)
  const first = merged[group.roles[0]]
  if (!group.roles.every((role) => merged[role] === first)) return null
  return (RADIUS_GROUP_STEPS as readonly string[]).includes(first) ? (first as RadiusGroupStep) : null
}

/** Set every role on one axis to `step`, leaving the other axes alone. */
export function applyRadiusGroup(
  group: RadiusGroup,
  roles: Record<string, string> | undefined,
  step: RadiusGroupStep,
): Record<string, string> {
  const next = mergeLayoutRoles('radius', roles)
  for (const role of group.roles) next[role] = step
  return next
}

/** Role map for a set of axis choices — what a System Style declares. */
export function radiusRolesFromGroups(
  picks: Partial<Record<string, RadiusGroupStep>>,
): Record<string, string> {
  let roles = defaultLayoutRoles('radius')
  for (const group of RADIUS_GROUPS) {
    const step = picks[group.key]
    if (step) roles = applyRadiusGroup(group, roles, step)
  }
  return roles
}

/**
 * ── Radius presets are ROLE bundles, not ramps ───────────────────────────────
 *
 * The static ramp IS the Corner Radius table (`RADIUS_STANDARD`) — the
 * Variables tables are the source of truth and every widget just follows that
 * token pattern. A preset therefore never regrades the ramp: it picks the three
 * axes (Boxes · Fields · Selectors) ON that ramp, so choosing one and the three
 * axis rows are one decision seen two ways. Sharp means every corner is 0;
 * Rounded is exactly the default roles. Picking a preset also puts the ramp back
 * on the standard table and clears per-viewport overrides — it is a whole look.
 *
 * (`RADIUS_PRESETS` — the old lg-graded ramps — stays for migrations and the
 * retired wizard; no live control offers it.)
 */
export interface RadiusRolePreset {
  label: string
  description: string
  picks: Record<'boxes' | 'fields' | 'selectors', RadiusGroupStep>
}

export const RADIUS_ROLE_PRESETS: RadiusRolePreset[] = [
  { label: 'Sharp', description: 'Square corners everywhere — 0 / 0 / 0.', picks: { boxes: 'none', fields: 'none', selectors: 'none' } },
  { label: 'Soft', description: 'A hint of rounding — boxes 8, fields 4, selectors 4.', picks: { boxes: 'lg', fields: 'sm', selectors: 'sm' } },
  { label: 'Rounded', description: 'The standard — boxes 16, fields 8, selectors 4.', picks: { boxes: '2xl', fields: 'lg', selectors: 'sm' } },
  { label: 'Pill', description: 'Generous — boxes 32, pill fields, selectors 8.', picks: { boxes: '4xl', fields: '4xl', selectors: 'lg' } },
]

/** The role map a preset produces (the `pill` role and any role outside the
 *  three axes are left as they are). */
export function radiusRolesForPreset(label: string, roles?: Record<string, string>): Record<string, string> | null {
  const preset = RADIUS_ROLE_PRESETS.find((p) => p.label === label)
  if (!preset) return null
  let next = mergeLayoutRoles('radius', roles)
  for (const group of RADIUS_GROUPS) next = applyRadiusGroup(group, next, preset.picks[group.key as keyof RadiusRolePreset['picks']])
  return next
}

/** The preset the three axes currently match, or null (shown as Custom). */
export function matchRadiusRolePreset(roles: Record<string, string> | undefined): string | null {
  const hit = RADIUS_ROLE_PRESETS.find((p) =>
    RADIUS_GROUPS.every((group) => radiusGroupStep(group, roles) === p.picks[group.key as keyof RadiusRolePreset['picks']]))
  return hit?.label ?? null
}

/** Everything a preset writes: the standard ramp, the three axes, and no
 *  per-viewport overrides. One patch, so every surface applies it the same. */
export function radiusPresetPatch(label: string, roles?: Record<string, string>) {
  const radiusRoles = radiusRolesForPreset(label, roles)
  if (!radiusRoles) return null
  return { radius: { ...RADIUS_STANDARD }, radiusRoles, radiusRoleViewports: {} as RadiusRoleViewports }
}

/** Resolved px of each axis for a preset on the standard ramp — for labels. */
export function radiusPresetPx(preset: RadiusRolePreset): [number, number, number] {
  const px = (step: string) => parseFloat(RADIUS_STANDARD[step as RadiusStep] ?? '0') || 0
  return [px(preset.picks.boxes), px(preset.picks.fields), px(preset.picks.selectors)]
}

/** The rungs the roles occupied before v63, and the factor between the two
 *  ladders. The migration needs both; nothing else should. */
export const LEGACY_RADIUS_ROLE_RUNGS: Record<string, string> =
  { control: 'sm', action: '2xl', container: '3xl', overlay: '4xl', pill: 'full' }
export const LEGACY_RADIUS_LG_FACTOR = 2

/** True when every working step is exactly what `scaleRadiusFromLg` would emit
 *  for this ramp's own `lg` — i.e. a preset, the slider or the seeded default,
 *  and therefore safe to re-grade. A ramp with any hand-typed step is not. */
export function isGradedRadiusRamp(radius: Record<string, string> | undefined): boolean {
  const lg = parseFloat(radius?.lg ?? '')
  if (!radius || !Number.isFinite(lg) || lg <= 0) return false
  const graded = scaleRadiusFromLg(lg)
  // Migration-only (v67), so it judges the ramp by the steps that existed
  // then — a pre-v77 ramp has no 5xl and must still read as graded.
  return LEGACY_RADIUS_WORKING_STEPS.every((step) => radius[step] === graded[step])
}

/** The working steps before v77 added 5xl. Migrations only. */
export const LEGACY_RADIUS_WORKING_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const

/** v77 rename: a pre-v77 step name → the step that carries the same pixels on
 *  the Tailwind-named ramp (every name moved up two rungs). `4xl` has no
 *  counterpart (it was 4 × the old lg, 64px at the default); a role on it is
 *  pinned to its pixels instead. */
export const RADIUS_V77_RENAME: Record<string, string> = {
  none: 'none', xs: 'sm', sm: 'lg', md: 'xl', lg: '2xl', xl: '3xl', '2xl': '4xl', '3xl': '5xl', full: 'full',
}

/** Store v77: rename one slot's radius ramp + roles onto the Tailwind names
 *  without moving any resolved pixel. The two new rungs between (xs, md) are
 *  the midpoints the ratio ladder puts there. Hand-edited values survive —
 *  they are carried by name, not re-graded. Mutates `slot`. */
export function renameRadiusV77(
  slot: { radius?: Record<string, string>; radiusRoles?: Record<string, string> } | null | undefined,
  /** The ramp a slot's roles read when it carries none of its own (a theme
   *  override that only re-points roles reads the system ramp). Pre-rename. */
  inheritedRadius?: Record<string, string>,
): void {
  if (!slot || typeof slot !== 'object') return
  const own = slot.radius && typeof slot.radius === 'object' ? slot.radius : undefined
  const old = own ?? inheritedRadius
  if (own) {
    const px = (k: string) => parseFloat(own[k] ?? '')
    const next: Record<string, string> = { none: own.none ?? '0px', full: own.full ?? '9999px' }
    for (const [from, to] of Object.entries(RADIUS_V77_RENAME)) {
      if (from === 'none' || from === 'full' || own[from] === undefined) continue
      next[to] = own[from]
    }
    if (Number.isFinite(px('xs'))) next.xs = `${Math.round(px('xs') / 2)}px`
    if (Number.isFinite(px('xs')) && Number.isFinite(px('sm'))) next.md = `${Math.round((px('xs') + px('sm')) / 2)}px`
    slot.radius = next
  }
  if (slot.radiusRoles && typeof slot.radiusRoles === 'object') {
    const roles: Record<string, string> = {}
    for (const [role, step] of Object.entries(slot.radiusRoles)) {
      if (typeof step !== 'string') continue
      if (roleDimensionPx(step) !== null) roles[role] = step
      else if (RADIUS_V77_RENAME[step]) roles[role] = RADIUS_V77_RENAME[step]
      else {
        const n = parseFloat(old?.[step] ?? '')
        roles[role] = Number.isFinite(n) ? dimensionRoleValue(n) : step
      }
    }
    slot.radiusRoles = roles
  }
}

// ── Responsive radius (Desktop · Tablet · Mobile) ───────────────────────────
// Corner rounding scales with the screen: the same semantic size steps DOWN on
// smaller viewports so a card keeps its proportion on a phone. Ten responsive
// tokens, each REFERENCING a static step (never a raw value):
//
//   step   none  sm   md   lg   xl   2xl  3xl  4xl  5xl  full
//   Desk   none  sm   md   lg   xl   2xl  3xl  4xl  5xl  full
//   Tab    none  xs   sm   md   lg   xl   2xl  3xl  4xl  full   one step down
//   Mob    none  xs   sm   md   lg   xl   xl   2xl  3xl  full   two from 3xl up
//
// `xs` is the floor, not a responsive token: there is nothing smaller to step
// to, so a role on xs (or pinned to a primitive) holds one value everywhere.
// The radius ROLES follow this table — `radius.container` on 2xl is 16 / 12 /
// 12 — which is what makes a component's corners responsive at all.

export const RADIUS_RESPONSIVE_STEPS = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full'] as const
export type RadiusResponsiveStep = (typeof RADIUS_RESPONSIVE_STEPS)[number]

export const RADIUS_RESPONSIVE: Record<RadiusResponsiveStep, Record<GridViewport, RadiusStep>> = {
  none: { desktop: 'none', tablet: 'none', mobile: 'none' },
  sm: { desktop: 'sm', tablet: 'xs', mobile: 'xs' },
  md: { desktop: 'md', tablet: 'sm', mobile: 'sm' },
  lg: { desktop: 'lg', tablet: 'md', mobile: 'md' },
  xl: { desktop: 'xl', tablet: 'lg', mobile: 'lg' },
  '2xl': { desktop: '2xl', tablet: 'xl', mobile: 'xl' },
  '3xl': { desktop: '3xl', tablet: '2xl', mobile: 'xl' },
  '4xl': { desktop: '4xl', tablet: '3xl', mobile: '2xl' },
  '5xl': { desktop: '5xl', tablet: '4xl', mobile: '3xl' },
  full: { desktop: 'full', tablet: 'full', mobile: 'full' },
}

/** Hand-set radius role values for the smaller viewports. A role with no
 *  entry FOLLOWS Desktop one (or two) rungs down; an entry is a step or a
 *  pinned primitive, exactly like a Desktop role value. Only what someone
 *  changed is stored, so an untouched system carries `{}`. */
export type RadiusRoleViewports = Partial<Record<'tablet' | 'mobile', Record<string, string>>>

/** The value one radius role reads at a viewport: Desktop's own value; on a
 *  smaller viewport the hand-set override, else Desktop stepped down. */
export function radiusRoleAt(
  roles: Record<string, string> | undefined,
  viewports: RadiusRoleViewports | undefined,
  role: string,
  viewport: GridViewport,
): string {
  const desktop = mergeLayoutRoles('radius', roles)[role]
  if (viewport === 'desktop') return desktop
  return viewports?.[viewport]?.[role] ?? radiusAtViewport(desktop, viewport)
}

/** The static step a role value reads at a viewport. A pinned primitive or a
 *  step with no responsive token (xs) returns itself. */
export function radiusAtViewport(value: string, viewport: GridViewport): string {
  const row = RADIUS_RESPONSIVE[value as RadiusResponsiveStep]
  return row ? row[viewport] : value
}

/** The value to STORE when a radius role is picked as a px. A px that a
 *  responsive step carries on this ramp is stored as that step, so the role
 *  keeps stepping down on Tablet and Mobile; any other px is pinned (and then
 *  holds one value everywhere, like any pinned primitive). */
export function radiusRoleValueForPx(px: number, radius: Record<string, string> | undefined): string {
  for (const step of RADIUS_RESPONSIVE_STEPS) {
    if (parseDimension(radius?.[step]) === px) return step
  }
  return dimensionRoleValue(px)
}

/** Every radius role read at one viewport (steps moved down, pins kept). */
export function radiusRolesAtViewport(
  roles: Record<string, string> | undefined,
  viewport: GridViewport,
  viewports?: RadiusRoleViewports,
): Record<string, string> {
  const merged = mergeLayoutRoles('radius', roles)
  if (viewport === 'desktop') return merged
  return Object.fromEntries(Object.keys(merged).map((k) => [k, radiusRoleAt(merged, viewports, k, viewport)]))
}

/** Set (or clear) one role's override at a smaller viewport. Picking the value
 *  it would follow anyway CLEARS the override, so the role keeps following
 *  Desktop instead of freezing on today's derived step. */
export function setRadiusRoleViewport(
  viewports: RadiusRoleViewports | undefined,
  roles: Record<string, string> | undefined,
  role: string,
  viewport: 'tablet' | 'mobile',
  value: string | null,
): RadiusRoleViewports {
  const next: RadiusRoleViewports = { ...viewports, [viewport]: { ...viewports?.[viewport] } }
  const follows = radiusAtViewport(mergeLayoutRoles('radius', roles)[role], viewport)
  if (value === null || value === follows) delete next[viewport]![role]
  else next[viewport]![role] = value
  if (!Object.keys(next[viewport]!).length) delete next[viewport]
  return next
}

/** The ten responsive tokens as CSS: `--radius-component-<step>` references
 *  the static `--radius-<step>` (so a theme that redefines the ramp needs no
 *  block of its own). Desktop on `:root`; Tablet / Mobile override only the
 *  tokens that step down. */
export function radiusComponentCss(viewport: GridViewport = 'desktop'): string[] {
  return RADIUS_RESPONSIVE_STEPS
    .filter((step) => viewport === 'desktop' || RADIUS_RESPONSIVE[step][viewport] !== step)
    .map((step) => `--radius-component-${step}: var(--radius-${RADIUS_RESPONSIVE[step][viewport]});`)
}

/** The radius roles that alias responsive token `step` (a pinned role aliases
 *  none). This is the link the editor shows in both directions: a role names
 *  its token, a token names its roles. */
export function rolesUsingRadiusToken(roles: Record<string, string> | undefined, step: string): string[] {
  const merged = mergeLayoutRoles('radius', roles)
  return LAYOUT_ROLES.radius.filter((r) => merged[r.key] === step).map((r) => r.key)
}

/** The responsive tokens grouped by the role group (Boxes · Fields ·
 *  Selectors) whose roles alias them, plus `unassigned` for the ones no role
 *  uses — available to a component that needs a specific size. A token two
 *  groups share appears under both. */
export function radiusTokensByRoleGroup(roles: Record<string, string> | undefined): Record<string, RadiusResponsiveStep[]> {
  const merged = mergeLayoutRoles('radius', roles)
  const out: Record<string, RadiusResponsiveStep[]> = {}
  const used = new Set<string>()
  for (const group of LAYOUT_ROLE_GROUPS.radius) {
    const steps = LAYOUT_ROLES.radius.filter((r) => r.group === group.id).map((r) => merged[r.key])
    out[group.id] = RADIUS_RESPONSIVE_STEPS.filter((step) => steps.includes(step))
    out[group.id].forEach((step) => used.add(step))
  }
  out.unassigned = RADIUS_RESPONSIVE_STEPS.filter((step) => !used.has(step))
  return out
}

/** `--radius-<role>` overrides for one smaller viewport — only the roles whose
 *  value actually changes there. */
export function radiusRolesViewportCss(
  viewport: GridViewport,
  roles: Record<string, string> | undefined,
  radius: Record<string, string> | undefined,
  viewports?: RadiusRoleViewports,
): string[] {
  const merged = mergeLayoutRoles('radius', roles)
  const out: string[] = []
  for (const role of LAYOUT_ROLES.radius) {
    const value = merged[role.key]
    const step = radiusRoleAt(merged, viewports, role.key, viewport)
    if (step === value) continue
    out.push(`--radius-${role.key}: ${layoutValueCss('radius', step, radius)};`)
  }
  return out
}

/** True when the stored radius roles are still the ones the pre-v67 ladder
 *  shipped — nothing hand-picked, so the migration may re-level them. An absent
 *  map means "defaults", which is the legacy default at migration time. */
export function radiusRolesAreLegacyDefault(roles: Record<string, string> | undefined): boolean {
  if (!roles) return true
  return Object.entries(LEGACY_RADIUS_ROLE_RUNGS)
    .every(([key, rung]) => roles[key] === undefined || roles[key] === rung)
}

/**
 * Spacing roles alias a RESPONSIVE token where one carries their Desktop value
 * exactly (`gap-section` → `section-md`, 24 / 16 / 12), so they tighten on
 * Tablet and Mobile without any Desktop pixel moving. Two stay on a static step
 * on purpose: `none` (0 everywhere anyway) and `inset-surface` — its 20px has
 * no responsive token, and moving every card to 16 would restyle every system
 * and System Style; point it at `component-lg` in the table to opt in.
 */
export const SPACING_ROLES: LayoutRole[] = [
  { key: 'none', label: 'None', description: 'Collapse a gap or inset.', group: 'gap', primitive: '0' },
  { key: 'gap-tight', label: 'Gap tight', description: 'Icon + label, chip dismiss, inline meta.', group: 'gap', primitive: 'component-xs' },
  { key: 'gap-control', label: 'Gap control', description: 'Button groups, OTP cells, field + helper.', group: 'gap', primitive: 'component-sm' },
  { key: 'gap-group', label: 'Gap group', description: 'Stacked fields, nav item groups.', group: 'gap', primitive: 'section-sm' },
  { key: 'gap-section', label: 'Gap section', description: 'Between sections, modal header → body.', group: 'gap', primitive: 'section-md' },
  { key: 'inset-control', label: 'Inset control', description: 'Padding inside buttons, inputs, chips.', group: 'inset', primitive: 'component-md' },
  { key: 'inset-surface', label: 'Inset surface', description: 'Card / modal / alert padding.', group: 'inset', primitive: '5' },
  { key: 'inset-page', label: 'Inset page', description: 'Page and sheet margins when Grid is unused.', group: 'inset', primitive: 'layout-xs' },
  // Overlap — NEGATIVE space: how far a stacked item tucks under its neighbour
  // (avatar stacks, overlapping badges). Pinned primitives, not steps: a spacing
  // step is never negative, and the base-unit dial must not move an avatar stack.
  { key: 'overlap-xs', label: 'Overlap xs', description: 'Barely touching — dense avatar stacks.', group: 'overlap', primitive: 'dimension--2' },
  { key: 'overlap-sm', label: 'Overlap sm', description: 'A hairline tuck.', group: 'overlap', primitive: 'dimension--4' },
  { key: 'overlap-md', label: 'Overlap md', description: 'The default avatar-stack overlap.', group: 'overlap', primitive: 'dimension--8' },
  { key: 'overlap-lg', label: 'Overlap lg', description: 'A third of a 48px avatar.', group: 'overlap', primitive: 'dimension--16' },
  { key: 'overlap-xl', label: 'Overlap xl', description: 'Heavily stacked; only the edge shows.', group: 'overlap', primitive: 'dimension--24' },
  { key: 'overlap-2xl', label: 'Overlap 2xl', description: 'Nearly fully covered — a count badge on a stack.', group: 'overlap', primitive: 'dimension--32' },
]

/**
 * SPACING MODES — four ready-made densities for the Theme preview's Spacing
 * edition, so a theme gets a coherent feel in one pick instead of three dials.
 * Every value is already ON the token scales (a field base inside
 * `BASE_UNIT_RANGE`, a static spacing step, a `STROKE_SM_STOPS` width), so a
 * mode writes ordinary tokens and the result stays editable in Variables.
 *
 * Two axes, the corners of the "Character" pad the modes come from:
 * Compact ↔ Airy is how much room things take; Quiet ↔ Bold is how much they
 * assert themselves. Quiet IS the standard system (base 4 · 20px · 1px), so a
 * fresh theme reads as Quiet, not "Custom".
 */
export interface SpacingMode {
  id: 'compact' | 'quiet' | 'bold' | 'airy'
  label: string
  description: string
  /** Field base unit → `buildSizesFromBase` (control md = base × 10). */
  fieldBase: number
  /** The `inset-surface` spacing step (card / modal / alert padding). */
  insetStep: SpacingStep
  /** `stroke.sm` in px — every divider and control border. */
  border: (typeof STROKE_SM_STOPS)[number]
}

export const SPACING_MODES: readonly SpacingMode[] = [
  { id: 'compact', label: 'Compact', description: 'Dense: smaller controls, tight cards.', fieldBase: 3.5, insetStep: '3', border: 1 },
  { id: 'quiet', label: 'Quiet', description: 'The standard: calm, nothing shouts.', fieldBase: 4, insetStep: '5', border: 1 },
  { id: 'bold', label: 'Bold', description: 'Larger controls, heavier strokes.', fieldBase: 4.5, insetStep: '5', border: 2 },
  { id: 'airy', label: 'Airy', description: 'Roomy: big targets, generous cards.', fieldBase: 5, insetStep: '6', border: 1 },
]

/** The mode a theme currently sits on, or null when any of the three values was
 *  set by hand (read: "Custom"). Read from the tokens, never stored. */
export function matchSpacingMode(
  sizes: Record<string, string> | undefined,
  spacingRoles: Record<string, string> | undefined,
  stroke: Record<string, string> | undefined,
): SpacingMode['id'] | null {
  const base = inferSizeBase(sizes ?? {})
  const inset = spacingRefStep(mergeLayoutRoles('spacing', spacingRoles)[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP)
  const border = parseFloat(stroke?.sm ?? '1px')
  return SPACING_MODES.find((m) => m.fieldBase === base && m.insetStep === inset && m.border === border)?.id ?? null
}

/** The six Overlap sizes, as the `overlap-<size>` role keys carry them. */
export const OVERLAP_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
export type OverlapSize = (typeof OVERLAP_SIZES)[number]

/** The static steps the spacing roles defaulted to before v79 — the migration
 *  moves a role only while it still holds exactly this. */
export const LEGACY_SPACING_ROLE_STEPS: Record<string, string> = {
  'gap-tight': '1', 'gap-control': '2', 'gap-group': '4', 'gap-section': '6', 'inset-control': '3', 'inset-page': '8',
}

/** Store v79: move a slot's spacing roles that are still on their pre-v79
 *  default step onto the responsive token with the same Desktop value, and
 *  backfill the new static steps (0_5 · 1_5 · 2_5 · 24 · 32) from the slot's own
 *  base. A hand-picked role and a hand-edited step stay as they are. */
export function migrateSpacingV79(slot: { spacing?: Record<string, string>; spacingRoles?: Record<string, string> } | null | undefined): void {
  if (!slot || typeof slot !== 'object') return
  if (slot.spacing && typeof slot.spacing === 'object') {
    const base = parseFloat(slot.spacing['1'] ?? '') || SPACING_DEFAULT_BASE
    const graded = buildSpacingFromBase(base)
    const next = { ...slot.spacing }
    for (const step of SPACING_STEPS) if (next[step] === undefined) next[step] = graded[step]
    slot.spacing = next
  }
  if (slot.spacingRoles && typeof slot.spacingRoles === 'object') {
    const next = { ...slot.spacingRoles }
    for (const role of SPACING_ROLES) {
      const legacy = LEGACY_SPACING_ROLE_STEPS[role.key]
      if (legacy && next[role.key] === legacy) next[role.key] = role.primitive
    }
    slot.spacingRoles = next
  }
}

export const SIZE_ROLES: LayoutRole[] = [
  { key: 'compact', label: 'Compact', description: 'Toolbars, dense tables.', group: 'control', primitive: 'sm' },
  { key: 'control', label: 'Control', description: 'Default button, input, select height.', group: 'control', primitive: 'md' },
  { key: 'touch', label: 'Touch', description: 'Mobile CTA. 48px covers HIG 44.', group: 'control', primitive: 'lg' },
  { key: 'hit', label: 'Hit', description: 'Close button and icon-only hit area.', group: 'special', primitive: 'xs' },
  { key: 'fab', label: 'FAB', description: 'Floating action button.', group: 'special', primitive: 'xl' },
]

export const SELECTOR_ROLES: LayoutRole[] = [
  { key: 'control', label: 'Control', description: 'Checkbox, radio, switch track height.', group: 'glyph', primitive: 'md' },
  { key: 'compact', label: 'Compact', description: 'The same glyphs in a dense row or table.', group: 'glyph', primitive: 'sm' },
  { key: 'indicator', label: 'Indicator', description: 'Badge dot, status pip, unread marker.', group: 'glyph', primitive: 'xs' },
]

export const STROKE_ROLES: LayoutRole[] = [
  { key: 'divider', label: 'Divider', description: 'Separator, table rules, layout splits.', group: 'line', primitive: 'sm' },
  { key: 'control', label: 'Control', description: 'Input, card, outline button border-width.', group: 'line', primitive: 'sm' },
  { key: 'focus', label: 'Focus', description: 'Focus-ring spread. Paint stays border.focus.', group: 'line', primitive: 'md' },
]

export const BREAKPOINT_ROLES: LayoutRole[] = [
  { key: 'desktop', label: 'Desktop', description: 'Min-width where the 12-col grid starts.', group: 'viewport', primitive: 'md' },
  { key: 'tablet', label: 'Tablet', description: 'Min-width where the 8-col grid starts.', group: 'viewport', primitive: 'sm' },
  { key: 'mobile', label: 'Mobile', description: 'Max-width of the 4-col grid (one step below Tablet).', group: 'viewport', primitive: 'sm' },
]

export const LAYOUT_ROLES: Record<LayoutFamily, LayoutRole[]> = {
  radius: RADIUS_ROLES,
  spacing: SPACING_ROLES,
  size: SIZE_ROLES,
  selector: SELECTOR_ROLES,
  stroke: STROKE_ROLES,
  breakpoint: BREAKPOINT_ROLES,
}

export const LAYOUT_PRIMITIVE_STEPS: Record<LayoutFamily, readonly string[]> = {
  radius: RADIUS_STEPS,
  spacing: SPACING_STEPS,
  size: SIZE_STEPS,
  selector: SELECTOR_STEPS,
  stroke: STROKE_STEPS,
  breakpoint: BREAKPOINT_STEPS,
}

export function layoutRolesInGroup(family: LayoutFamily, group: string | 'all'): LayoutRole[] {
  const all = LAYOUT_ROLES[family]
  if (group === 'all') return all
  return all.filter((r) => r.group === group)
}

export function defaultLayoutRoles(family: LayoutFamily): Record<string, string> {
  return Object.fromEntries(LAYOUT_ROLES[family].map((r) => [r.key, r.primitive]))
}

const PRIMITIVE_SET: Record<LayoutFamily, Set<string>> = {
  radius: new Set(RADIUS_STEPS),
  spacing: new Set(SPACING_STEPS),
  size: new Set(SIZE_STEPS),
  selector: new Set(SELECTOR_STEPS),
  stroke: new Set(STROKE_STEPS),
  breakpoint: new Set(BREAKPOINT_STEPS),
}

/** Seed or repair a stored map. User aliases on known roles are kept. */
export function mergeLayoutRoles(
  family: LayoutFamily,
  stored?: Record<string, string> | null,
): Record<string, string> {
  const bag = stored ?? {}
  const allowed = PRIMITIVE_SET[family]
  const out: Record<string, string> = {}
  for (const role of LAYOUT_ROLES[family]) {
    const hit = bag[role.key]
    const ok = typeof hit === 'string' && (allowed.has(hit) || roleDimensionPx(hit, family === 'spacing') !== null || (family === 'spacing' && isSpacingResponsiveRef(hit)))
    out[role.key] = ok ? hit : role.primitive
  }
  return out
}

/** Is this role still on its default? A pinned primitive counts as default only
 *  when it resolves to the same px as the default STEP — pass the family's scale
 *  for that comparison; without it, only the step name itself is default. */
export function layoutRoleIsDefault(
  family: LayoutFamily,
  key: string,
  value: string,
  steps?: Record<string, string>,
): boolean {
  const spec = LAYOUT_ROLES[family].find((r) => r.key === key)
  if (!spec || spec.primitive === value) return true
  if (!steps || roleDimensionPx(value, family === 'spacing') === null) return false
  const def = roleValuePx(spec.primitive, steps)
  return def !== null && def === roleValuePx(value, steps)
}

export function resolveLayoutRole(
  family: LayoutFamily,
  roles: Record<string, string> | undefined,
  primitives: Record<string, string>,
  key: string,
  fallback = '',
): string {
  const spec = LAYOUT_ROLES[family].find((r) => r.key === key)
  const raw = roles?.[key] ?? spec?.primitive
  if (!raw) return fallback
  // A responsive spacing reference reads its Desktop step here; viewport-aware
  // callers resolve the roles through `spacingRolesAtViewport` first.
  const step = family === 'spacing' ? spacingRefStep(raw) : raw
  const pinned = roleDimensionPx(step, family === 'spacing')
  if (pinned !== null) return `${pinned}px`
  return primitives[step] || fallback
}

export function layoutRoleVar(family: LayoutFamily, key: string): string {
  return `--${family}-${key}`
}

export function layoutPrimitiveVar(family: LayoutFamily, step: string): string {
  return `var(--${family}-${step})`
}

/** The CSS a role value points at: the Dimension primitive it resolves to
 *  (`var(--dimension-16)`). Given the family's scale, a STEP resolves too — the
 *  role then aliases the primitive directly, not `--radius-lg`. Without the
 *  scale a step falls back to its own variable, which is what a caller that
 *  cannot resolve (an older partial export) used to get. */
export function layoutValueCss(
  family: LayoutFamily,
  value: string,
  steps?: Record<string, string>,
): string {
  const px = roleValuePx(value, steps)
  return px !== null ? `var(--dimension-${dimensionKey(px)})` : layoutPrimitiveVar(family, value)
}

/** The Dimension primitive a role value points at, by name (`dimension-16`) —
 *  what the editor shows in place of a step name. A value that resolves to no
 *  length keeps its own name. */
export function rolePrimitiveName(value: string, steps?: Record<string, string>): string {
  const px = roleValuePx(value, steps)
  return px !== null ? `${ROLE_DIMENSION_PREFIX}${dimensionKey(px)}` : value
}

/** `:root` alias declarations — semantic → Dimension primitive, never raw px.
 *  `steps` is the family's scale (`radius`, `spacing`, …): with it every role
 *  aliases its primitive directly. */
export function layoutRoleCssVars(
  family: LayoutFamily,
  roles?: Record<string, string> | null,
  steps?: Record<string, string>,
): string[] {
  const map = mergeLayoutRoles(family, roles)
  return LAYOUT_ROLES[family].map((role) => {
    const target = layoutValueCss(family, map[role.key], steps)
    if (family === 'breakpoint' && role.key === 'mobile') return `--breakpoint-mobile: calc(${target} - 1px);`
    if (family === 'breakpoint' && role.key === 'tablet') return `--breakpoint-tablet: ${target};`
    if (family === 'breakpoint' && role.key === 'desktop') return `--breakpoint-desktop: ${target};`
    return `${layoutRoleVar(family, role.key)}: ${target};`
  })
}

export function allLayoutRoleCssVars(
  roles: {
    radius?: Record<string, string>
    spacing?: Record<string, string>
    size?: Record<string, string>
    selector?: Record<string, string>
    stroke?: Record<string, string>
    breakpoint?: Record<string, string>
  },
  scales: Partial<Record<LayoutFamily, Record<string, string>>> = {},
): string[] {
  return [
    ...layoutRoleCssVars('radius', roles.radius, scales.radius),
    ...layoutRoleCssVars('spacing', roles.spacing, scales.spacing),
    ...layoutRoleCssVars('size', roles.size, scales.size),
    ...layoutRoleCssVars('selector', roles.selector, scales.selector),
    ...layoutRoleCssVars('stroke', roles.stroke, scales.stroke),
    ...layoutRoleCssVars('breakpoint', roles.breakpoint, scales.breakpoint),
  ]
}

function breakpointStepPx(
  roles: Record<string, string> | undefined,
  breakpoints: Record<string, string>,
  key: string,
  fallback: string,
): number {
  const map = mergeLayoutRoles('breakpoint', roles)
  const step = map[key] ?? fallback
  const pinned = roleDimensionPx(step)
  if (pinned !== null) return pinned
  return parseFloat(breakpoints[step] || BREAKPOINT_STANDARD[step as BreakpointStep] || '768')
}

/** The px a viewport role resolves to (`desktop`, `tablet`, `mobile`), whether
 *  it holds a breakpoint step or a pinned primitive. */
export function breakpointRolePx(
  roles: Record<string, string> | undefined,
  breakpoints: Record<string, string>,
  key: 'desktop' | 'tablet' | 'mobile',
): number {
  const fallback = LAYOUT_ROLES.breakpoint.find((r) => r.key === key)?.primitive ?? 'md'
  return breakpointStepPx(roles, breakpoints, key, fallback)
}

/** Resolved `max-width` for the tablet (8-col) `@media` — one px below desktop. */
export function breakpointTabletMax(
  roles: Record<string, string> | undefined,
  breakpoints: Record<string, string>,
): string {
  const min = breakpointStepPx(roles, breakpoints, 'desktop', 'md')
  return `${Math.max(0, Math.round(min) - 1)}px`
}

/** Resolved max-width for `@media` — custom properties are not valid there. */
export function breakpointMobileMax(
  roles: Record<string, string> | undefined,
  breakpoints: Record<string, string>,
): string {
  const min = breakpointStepPx(roles, breakpoints, 'mobile', 'sm')
  return `${Math.max(0, Math.round(min) - 1)}px`
}

/** The scales a frame's fields are steps of. With them every field aliases its
 *  Dimension primitive directly; without, a step keeps its own variable. */
export interface GridFrameScales {
  spacing?: Record<string, string>
  /** `extractBreakpoints(grid)` — the breakpoint steps. */
  breakpoints?: Record<string, string>
}

function gridFrameAliasCss(alias: GridFrameAlias, scales: GridFrameScales = {}): string[] {
  const container = alias.container === 'none' ? 'none' : layoutValueCss('breakpoint', alias.container, scales.breakpoints)
  return [
    `--grid-columns: ${alias.columns};`,
    `--grid-gutter: ${layoutValueCss('spacing', alias.gutter, scales.spacing)};`,
    `--grid-margin: ${layoutValueCss('spacing', alias.margin, scales.spacing)};`,
    `--grid-container: ${container};`,
  ]
}

export function gridFrameRootCss(frame?: GridFrameModes | null, scales?: GridFrameScales): string[] {
  return gridFrameAliasCss(mergeGridFrame(frame).desktop, scales)
}

export function gridFrameTabletCss(frame?: GridFrameModes | null, scales?: GridFrameScales): string[] {
  return gridFrameAliasCss(mergeGridFrame(frame).tablet, scales)
}

export function gridFrameMobileCss(frame?: GridFrameModes | null, scales?: GridFrameScales): string[] {
  return gridFrameAliasCss(mergeGridFrame(frame).mobile, scales)
}

/** Nested tablet then mobile overrides. Desktop lives on `:root`. */
export function gridFrameMediaCss(
  roles: Record<string, string> | undefined,
  grid: Record<string, string> | undefined,
  frame?: GridFrameModes | null,
  spacing?: Record<string, string>,
  /** When given, the radius roles step down in the same two blocks (see
   *  RADIUS_RESPONSIVE) — one media query per viewport, not two. */
  radiusOpts?: { roles?: Record<string, string>; radius?: Record<string, string>; viewports?: RadiusRoleViewports },
  /** When given, the responsive spacing tokens and the roles on them step down
   *  in the same two blocks. */
  spacingOpts?: { roles?: Record<string, string>; spacing?: Record<string, string> },
): string {
  const bps = extractBreakpoints(grid)
  const scales: GridFrameScales = { spacing, breakpoints: bps }
  const indent = (lines: string[]) => lines.map((l) => `    ${l}`).join('\n')
  const radiusFor = (vp: GridViewport) => [
    ...(radiusOpts ? [...radiusComponentCss(vp), ...radiusRolesViewportCss(vp, radiusOpts.roles, radiusOpts.radius, radiusOpts.viewports)] : []),
    ...(spacingOpts ? [...spacingResponsiveCss(vp), ...spacingRolesViewportCss(vp, spacingOpts.roles, spacingOpts.spacing)] : []),
  ]
  return [
    `@media (max-width: ${breakpointTabletMax(roles, bps)}) {`,
    '  :root {',
    indent([...gridFrameTabletCss(frame, scales), ...radiusFor('tablet')]),
    '  }',
    '}',
    '',
    `@media (max-width: ${breakpointMobileMax(roles, bps)}) {`,
    '  :root {',
    indent([...gridFrameMobileCss(frame, scales), ...radiusFor('mobile')]),
    '  }',
    '}',
  ].join('\n')
}

/** Only the spacing tokens' and roles' tablet / mobile step-down, for a
 *  Spacing-only export. */
export function spacingMediaCss(
  roles: Record<string, string> | undefined,
  grid: Record<string, string> | undefined,
  spacingRoles: Record<string, string> | undefined,
  spacing: Record<string, string> | undefined,
): string {
  const bps = extractBreakpoints(grid)
  const out: string[] = []
  for (const [vp, max] of [['tablet', breakpointTabletMax(roles, bps)], ['mobile', breakpointMobileMax(roles, bps)]] as const) {
    const decls = [...spacingResponsiveCss(vp), ...spacingRolesViewportCss(vp, spacingRoles, spacing)]
    if (!decls.length) continue
    if (out.length) out.push('')
    out.push(`@media (max-width: ${max}) {`, '  :root {', ...decls.map((d) => `    ${d}`), '  }', '}')
  }
  return out.join('\n')
}

/** Only the radius roles' tablet / mobile step-down, for a Radius-only export. */
export function radiusMediaCss(
  roles: Record<string, string> | undefined,
  grid: Record<string, string> | undefined,
  radiusRoles: Record<string, string> | undefined,
  radius: Record<string, string> | undefined,
  viewports?: RadiusRoleViewports,
): string {
  const bps = extractBreakpoints(grid)
  const out: string[] = []
  for (const [vp, max] of [['tablet', breakpointTabletMax(roles, bps)], ['mobile', breakpointMobileMax(roles, bps)]] as const) {
    const decls = [...radiusComponentCss(vp), ...radiusRolesViewportCss(vp, radiusRoles, radius, viewports)]
    if (!decls.length) continue
    if (out.length) out.push('')
    out.push(`@media (max-width: ${max}) {`, '  :root {', ...decls.map((d) => `    ${d}`), '  }', '}')
  }
  return out.join('\n')
}

/** Nearest spacing step for a raw px (migrations, OTP recipes). */
export function nearestSpacingStep(spacing: Record<string, string>, targetPx: number): SpacingStep | null {
  const rows = SPACING_STEPS
    .map((key) => ({ key, n: parseFloat(spacing[key] ?? '') }))
    .filter((r) => Number.isFinite(r.n))
  if (!rows.length) return null
  return rows.reduce((best, r) => {
    const d = Math.abs(r.n - targetPx)
    const bd = Math.abs(best.n - targetPx)
    if (d < bd) return r
    if (d === bd && r.n > best.n) return r
    return best
  }).key
}
