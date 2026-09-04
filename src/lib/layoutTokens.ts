// Layout tokens — Radius · Spacing · Size · Selector · Stroke · Breakpoint.
// Same contract as typeRoles.ts: primitives are the scale (raw px). Semantics
// are intent aliases that ONLY reference a primitive key — never a new px.
//
// Naming (CSS / Figma / JSON), one convention:
//   primitive  `{family}-{step}`     --radius-2xl, --spacing-5, --breakpoint-md
//   semantic   `{family}-{intent}`   --radius-action: var(--radius-2xl)
//                                   --breakpoint-mobile: calc(var(--breakpoint-md) - 1px)
// Family prefixes stay identical so a consumer never has to guess `space-` vs
// `spacing-`. Steps are the public scale names (xs/sm/md… and 0/1/2/3/4/5…).

export type LayoutFamily = 'radius' | 'spacing' | 'size' | 'selector' | 'stroke' | 'breakpoint'

// ── Radius primitives ───────────────────────────────────────────────────────
// Tailwind / HeroUI model: one base (`lg` = `--radius`) and named steps as
// fixed ratios of it. Values at the default 8px base are the published table
// (xs 2 · sm 4 · md 6 · lg 8 · xl 12 · 2xl 16 · 3xl 24 · 4xl 32).
// `2.5xl` is NOT a step — neither Tailwind nor HeroUI ships it.

export const RADIUS_WORKING_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const
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
  radiusPreset('Sharp', 'lg 8px — Tailwind / HeroUI default', 8),
  radiusPreset('Soft', 'lg 12px — slightly softer controls', 12),
  radiusPreset('Rounded', 'lg 16px — friendly, approachable', 16),
  radiusPreset('Pill', 'lg 24px — generous, consumer apps', 24),
]

/**
 * System standard = Rounded (lg 16). With the roles on their natural rungs this
 * resolves control 4 / action 16 / container 24 / overlay 32 — the exact pixels
 * the old Sharp-ramp-plus-offset produced, so the default system is unchanged.
 * See the note on `RADIUS_ROLES` for why the offset had to go.
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
// 4px grid (Tailwind / Untitled). Step 5 = 20px so surface inset can alias
// the padding the platform already shipped, without a raw 20px collection.

export const SPACING_STEPS = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'] as const
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
    result[step] = `${Number(step) * base}px`
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
 *  step 5). Out-of-range / hand-edited role values fall back to step 5. */
export function insetSurfaceStepIndex(spacingRoles: Record<string, string> | undefined): number {
  const step = spacingRoles?.[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP
  const i = SPACING_STEPS.indexOf(step as SpacingStep)
  return i === -1 ? SPACING_STEPS.indexOf(PADDING_DEFAULT_STEP) : i
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
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
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

// ── Grid frame (desktop / mobile recipes) ───────────────────────────────────
// Columns are counts on a 12-col system. Gutter/margin alias spacing steps.
// Container aliases a breakpoint step, or `none` (no max-width).

export const GRID_COLUMN_STEPS = ['2', '4', '8', '12'] as const
export type GridColumnStep = (typeof GRID_COLUMN_STEPS)[number]

export const GRID_CONTAINER_STEPS = ['none', ...BREAKPOINT_STEPS] as const
export type GridContainerStep = (typeof GRID_CONTAINER_STEPS)[number]

export type GridViewport = 'desktop' | 'mobile'

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

/** Desktop matches the previous global grid. Mobile is the missing 4-col recipe. */
export const GRID_FRAME_STANDARD: GridFrameModes = {
  desktop: { columns: '12', gutter: '6', margin: '8', container: 'xl' },
  mobile: { columns: '4', gutter: '4', margin: '4', container: 'none' },
}

export function mergeGridFrame(stored?: GridFrameModes | null): GridFrameModes {
  const one = (hit: GridFrameAlias | undefined, fallback: GridFrameAlias): GridFrameAlias => {
    const columns = hit?.columns && (GRID_COLUMN_STEPS as readonly string[]).includes(hit.columns) ? hit.columns : fallback.columns
    const gutter = hit?.gutter && (SPACING_STEPS as readonly string[]).includes(hit.gutter) ? hit.gutter : fallback.gutter
    const margin = hit?.margin && (SPACING_STEPS as readonly string[]).includes(hit.margin) ? hit.margin : fallback.margin
    const container = hit?.container && (GRID_CONTAINER_STEPS as readonly string[]).includes(hit.container) ? hit.container : fallback.container
    return { columns, gutter, margin, container }
  }
  return {
    desktop: one(stored?.desktop, GRID_FRAME_STANDARD.desktop),
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
  const container = alias.container === 'none'
    ? 'none'
    : (breakpoints[alias.container] || BREAKPOINT_STANDARD[alias.container as BreakpointStep] || 'none')
  return {
    columns: Math.max(1, parseInt(alias.columns, 10) || 12),
    gutter: spacing[alias.gutter] || SPACING_STANDARD[alias.gutter as SpacingStep] || '24px',
    margin: spacing[alias.margin] || SPACING_STANDARD[alias.margin as SpacingStep] || '32px',
    container,
  }
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
  { key: 'control', label: 'Control', description: 'Checkbox, nested child, menu item, inner thumb.', group: 'selectors', primitive: 'xs' },
  { key: 'action', label: 'Action', description: 'Buttons, inputs, selects, OTP, tabs.', group: 'fields', primitive: 'sm' },
  { key: 'container', label: 'Container', description: 'Cards, accordion, inline alerts.', group: 'boxes', primitive: 'lg' },
  { key: 'overlay', label: 'Overlay', description: 'Modal, popover, command, dropdown.', group: 'boxes', primitive: 'lg' },
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
 * 0 / 4 / 8 / 16 / 32px, i.e. 0, 0.25rem, 0.5rem, 1rem, 2rem exactly.
 *
 * `pill` is deliberately NOT an axis. It means "this is a circle" (avatar,
 * progress, switch track) rather than "this is somewhat rounded", so it stays
 * `full`; putting it under Selectors would square off avatars the moment
 * someone picked a tighter checkbox. That is the one place these groups diverge
 * from DaisyUI, whose selector axis also covers the badge.
 */
export const RADIUS_GROUP_STEPS = ['none', 'xs', 'sm', 'lg', '2xl'] as const
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
  return RADIUS_WORKING_STEPS.every((step) => radius[step] === graded[step])
}

/** True when the stored radius roles are still the ones the pre-v67 ladder
 *  shipped — nothing hand-picked, so the migration may re-level them. An absent
 *  map means "defaults", which is the legacy default at migration time. */
export function radiusRolesAreLegacyDefault(roles: Record<string, string> | undefined): boolean {
  if (!roles) return true
  return Object.entries(LEGACY_RADIUS_ROLE_RUNGS)
    .every(([key, rung]) => roles[key] === undefined || roles[key] === rung)
}

export const SPACING_ROLES: LayoutRole[] = [
  { key: 'none', label: 'None', description: 'Collapse a gap or inset.', group: 'gap', primitive: '0' },
  { key: 'gap-tight', label: 'Gap tight', description: 'Icon + label, chip dismiss, inline meta.', group: 'gap', primitive: '1' },
  { key: 'gap-control', label: 'Gap control', description: 'Button groups, OTP cells, field + helper.', group: 'gap', primitive: '2' },
  { key: 'gap-group', label: 'Gap group', description: 'Stacked fields, nav item groups.', group: 'gap', primitive: '4' },
  { key: 'gap-section', label: 'Gap section', description: 'Between sections, modal header → body.', group: 'gap', primitive: '6' },
  { key: 'inset-control', label: 'Inset control', description: 'Padding inside buttons, inputs, chips.', group: 'inset', primitive: '3' },
  { key: 'inset-surface', label: 'Inset surface', description: 'Card / modal / alert padding.', group: 'inset', primitive: '5' },
  { key: 'inset-page', label: 'Inset page', description: 'Page and sheet margins when Grid is unused.', group: 'inset', primitive: '8' },
]

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
  { key: 'desktop', label: 'Desktop', description: 'Min-width where desktop type and 12-col grid start.', group: 'viewport', primitive: 'md' },
  { key: 'mobile', label: 'Mobile', description: 'Max-width cut: calc(primitive − 1px). Default type and 4-col grid.', group: 'viewport', primitive: 'md' },
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
    out[role.key] = typeof hit === 'string' && allowed.has(hit) ? hit : role.primitive
  }
  return out
}

export function layoutRoleIsDefault(family: LayoutFamily, key: string, primitive: string): boolean {
  const spec = LAYOUT_ROLES[family].find((r) => r.key === key)
  return !spec || spec.primitive === primitive
}

export function resolveLayoutRole(
  family: LayoutFamily,
  roles: Record<string, string> | undefined,
  primitives: Record<string, string>,
  key: string,
  fallback = '',
): string {
  const spec = LAYOUT_ROLES[family].find((r) => r.key === key)
  const step = roles?.[key] ?? spec?.primitive
  if (!step) return fallback
  return primitives[step] || fallback
}

export function layoutRoleVar(family: LayoutFamily, key: string): string {
  return `--${family}-${key}`
}

export function layoutPrimitiveVar(family: LayoutFamily, step: string): string {
  return `var(--${family}-${step})`
}

/** `:root` alias declarations — semantic → primitive, never raw px. */
export function layoutRoleCssVars(
  family: LayoutFamily,
  roles?: Record<string, string> | null,
): string[] {
  const map = mergeLayoutRoles(family, roles)
  return LAYOUT_ROLES[family].map((role) => {
    if (family === 'breakpoint' && role.key === 'mobile') {
      return `--breakpoint-mobile: calc(var(--breakpoint-${map.mobile}) - 1px);`
    }
    if (family === 'breakpoint' && role.key === 'desktop') {
      return `--breakpoint-desktop: var(--breakpoint-${map.desktop});`
    }
    return `${layoutRoleVar(family, role.key)}: ${layoutPrimitiveVar(family, map[role.key])};`
  })
}

export function allLayoutRoleCssVars(roles: {
  radius?: Record<string, string>
  spacing?: Record<string, string>
  size?: Record<string, string>
  selector?: Record<string, string>
  stroke?: Record<string, string>
  breakpoint?: Record<string, string>
}): string[] {
  return [
    ...layoutRoleCssVars('radius', roles.radius),
    ...layoutRoleCssVars('spacing', roles.spacing),
    ...layoutRoleCssVars('size', roles.size),
    ...layoutRoleCssVars('selector', roles.selector),
    ...layoutRoleCssVars('stroke', roles.stroke),
    ...layoutRoleCssVars('breakpoint', roles.breakpoint),
  ]
}

/** Resolved max-width for `@media` — custom properties are not valid there. */
export function breakpointMobileMax(
  roles: Record<string, string> | undefined,
  breakpoints: Record<string, string>,
): string {
  const step = mergeLayoutRoles('breakpoint', roles).mobile
  const min = parseFloat(breakpoints[step] || BREAKPOINT_STANDARD[step as BreakpointStep] || '768')
  return `${Math.max(0, Math.round(min) - 1)}px`
}

export function gridFrameRootCss(frame?: GridFrameModes | null): string[] {
  const d = mergeGridFrame(frame).desktop
  const container = d.container === 'none' ? 'none' : `var(--breakpoint-${d.container})`
  return [
    `--grid-columns: ${d.columns};`,
    `--grid-gutter: var(--spacing-${d.gutter});`,
    `--grid-margin: var(--spacing-${d.margin});`,
    `--grid-container: ${container};`,
  ]
}

export function gridFrameMobileCss(frame?: GridFrameModes | null): string[] {
  const m = mergeGridFrame(frame).mobile
  const container = m.container === 'none' ? 'none' : `var(--breakpoint-${m.container})`
  return [
    `--grid-columns: ${m.columns};`,
    `--grid-gutter: var(--spacing-${m.gutter});`,
    `--grid-margin: var(--spacing-${m.margin});`,
    `--grid-container: ${container};`,
  ]
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
