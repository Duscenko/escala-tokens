// Layout tokens — Radius · Spacing · Size · Selector · Stroke · Breakpoint.
// Same contract as typeRoles.ts: primitives are the scale (raw px). Semantics
// are intent aliases that ONLY reference a primitive key — never a new px.
//
// Naming (CSS / Figma / JSON), one convention:
//   primitive  `{family}-{step}`     --radius-md, --spacing-5, --breakpoint-md
//   semantic   `{family}-{intent}`   --radius-action: var(--radius-md)
//                                   --breakpoint-mobile: calc(var(--breakpoint-md) - 1px)
// Family prefixes stay identical so a consumer never has to guess `space-` vs
// `spacing-`. Steps are the public scale names (xs/sm/md… and 0/1/2/3/4/5…).

export type LayoutFamily = 'radius' | 'spacing' | 'size' | 'selector' | 'stroke' | 'breakpoint'

// ── Radius primitives ───────────────────────────────────────────────────────

export const RADIUS_STEPS = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full'] as const
export type RadiusStep = (typeof RADIUS_STEPS)[number]

export const RADIUS_PRESETS: { label: string; description: string; values: Record<RadiusStep, string> }[] = [
  {
    label: 'Sharp',
    description: 'No rounding — sharp, precise',
    values: { none: '0px', xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  },
  {
    label: 'Soft',
    description: 'Moderate rounding — balanced, modern',
    values: { none: '0px', xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
  },
  {
    label: 'Rounded',
    description: 'Generous rounding — friendly, approachable',
    values: { none: '0px', xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '9999px' },
  },
  {
    label: 'Pill',
    description: 'Very rounded — playful, consumer apps',
    values: { none: '0px', xs: '8px', sm: '12px', md: '20px', lg: '32px', xl: '40px', full: '9999px' },
  },
]

/** System standard = Rounded. Fresh systems and per-token reset share this ramp. */
export const RADIUS_STANDARD: Record<RadiusStep, string> = RADIUS_PRESETS[2].values

/** Grade the ramp from `lg`. Ratios match Rounded (xs=lg/6 … xl=4lg/3). */
export function scaleRadiusFromLg(lg: number, current?: Record<string, string>): Record<string, string> {
  const clamp = (n: number) => `${Math.max(0, Math.round(n))}px`
  return {
    ...current,
    none: '0px',
    xs: clamp(lg / 6),
    sm: clamp(lg / 3),
    md: clamp((lg * 2) / 3),
    lg: clamp(lg),
    xl: clamp((lg * 4) / 3),
    full: '9999px',
  }
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
  radius: [
    { id: 'control', label: 'Control', hint: 'Interactive chrome and nested corners.' },
    { id: 'surface', label: 'Surface', hint: 'Cards, overlays, pills.' },
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

export const RADIUS_ROLES: LayoutRole[] = [
  { key: 'control', label: 'Control', description: 'Checkbox, nested child, menu item, inner thumb.', group: 'control', primitive: 'xs' },
  { key: 'action', label: 'Action', description: 'Buttons, inputs, selects, OTP, tabs.', group: 'control', primitive: 'md' },
  { key: 'container', label: 'Container', description: 'Cards, accordion, inline alerts.', group: 'surface', primitive: 'lg' },
  { key: 'overlay', label: 'Overlay', description: 'Modal, popover, command, dropdown.', group: 'surface', primitive: 'xl' },
  { key: 'pill', label: 'Pill', description: 'Badge, chip, avatar, switch, progress.', group: 'surface', primitive: 'full' },
]

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
