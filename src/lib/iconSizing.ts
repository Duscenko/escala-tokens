// ── Icon sizing ──────────────────────────────────────────────────────────────
// Icons were only a LIBRARY and a WEIGHT. Their size was a literal in every
// component (ten different values across the specimens: 9 … 20px), so an icon
// never followed the control it sat in. This module gives the system the same
// three layers radius and spacing already have:
//
//   dimension-16          16px              ← primitive (Dimensions)
//   icon-size-md          {dimension.16}    ← the icon SCALE
//   icon-control-md       {icon-size-md}    ← a ROLE: where an icon is used
//
// The SCALE is fixed — 12 · 14 · 16 · 20 · 24 · 32. Icons are drawn on a pixel
// grid, and sizes between those read soft; every reference system (Material,
// Carbon, HIG) keeps a short ladder like this.
//
// The ROLES are DERIVED, never stored:
//   · control-sm … control-xl = the matching control height × ICON_CONTROL_RATIO,
//     snapped onto the scale. A control that grows (a Spacing mode, the field
//     base unit, a mobile touch size) takes its icon with it, with no second
//     decision — Compact controls get smaller icons, Airy ones bigger.
//   · inline  = the body text size, snapped: an icon in a sentence is as tall
//     as the letters around it.
//   · feature = the scale's `xl`: empty states, card headers, the large glyph.
// A derived role can't drift from the control it belongs to, which is the whole
// point; pinning one by hand is a later, separate decision.
//
// Pure data + functions, no React and no store — `previewTokens`, the exporters
// and the tests all read this one source.

import type { PhosphorWeight } from './phosphorIcons'

export const ICON_SIZE_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
export type IconSizeStep = (typeof ICON_SIZE_STEPS)[number]

/** The icon scale, in px — on the 4px icon grid, plus 14 for compact controls. */
export const ICON_SIZE_SCALE: Record<IconSizeStep, number> = {
  xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32,
}

/** Icon height as a share of its control's height. 0.42 reproduces the
 *  pairs the Button already shipped by hand (32 → 14, 40 → 16, 56 → 24). */
export const ICON_CONTROL_RATIO = 0.42

/** The control sizes an icon role follows, by the Sizes ramp's own steps. */
export const ICON_CONTROL_STEPS = ['sm', 'md', 'lg', 'xl'] as const
export type IconControlStep = (typeof ICON_CONTROL_STEPS)[number]

export type IconRole = `control-${IconControlStep}` | 'inline' | 'feature'
export const ICON_ROLES: readonly IconRole[] = [
  'control-sm', 'control-md', 'control-lg', 'control-xl', 'inline', 'feature',
]

export const ICON_ROLE_DESCRIPTION: Record<IconRole, string> = {
  'control-sm': 'Icon inside a small control (size sm).',
  'control-md': 'Icon inside a default control — button, input, select.',
  'control-lg': 'Icon inside a large control.',
  'control-xl': 'Icon inside an extra-large control.',
  inline: 'Icon set in running text — as tall as the letters.',
  feature: 'Large glyph — empty states, card headers.',
}

/** The step of the scale nearest to `px`; a tie goes UP (an icon a hair too big
 *  reads better than one a hair too small). */
export function snapIconStep(px: number): IconSizeStep {
  let best: IconSizeStep = 'md'
  let bestDiff = Infinity
  for (const step of ICON_SIZE_STEPS) {
    const diff = Math.abs(ICON_SIZE_SCALE[step] - px)
    if (diff < bestDiff || (diff === bestDiff && ICON_SIZE_SCALE[step] > ICON_SIZE_SCALE[best])) {
      best = step
      bestDiff = diff
    }
  }
  return best
}

const parsePx = (value: string | undefined): number | null => {
  const n = parseFloat(value ?? '')
  return Number.isFinite(n) ? n : null
}

/** Every icon role → the scale step it resolves to, from the system's own
 *  control heights (`sizes`) and body text size. */
export function resolveIconRoles(
  sizes: Record<string, string> | undefined,
  bodySize: string | undefined,
): Record<IconRole, IconSizeStep> {
  const out = {} as Record<IconRole, IconSizeStep>
  const fallbackControl: Record<IconControlStep, number> = { sm: 32, md: 40, lg: 48, xl: 56 }
  for (const step of ICON_CONTROL_STEPS) {
    const h = parsePx(sizes?.[step]) ?? fallbackControl[step]
    out[`control-${step}`] = snapIconStep(h * ICON_CONTROL_RATIO)
  }
  out.inline = snapIconStep(parsePx(bodySize) ?? 16)
  out.feature = 'xl'
  return out
}

/** The px an icon role resolves to. */
export function iconRolePx(roles: Record<IconRole, IconSizeStep>, role: IconRole): number {
  return ICON_SIZE_SCALE[roles[role]]
}

// ── Minimum weight for small icons ───────────────────────────────────────────
// Below 16px a thin or light stroke is a fraction of a device pixel and the
// glyph washes out — measured on Phosphor, `thin` at 12px is a ~0.6px line.
// Small icons therefore render at least `regular`; at 16px and up the theme's
// own weight applies untouched. Bold, fill and duotone are already heavy enough
// and are never changed.

/** Smallest size at which a light weight is used as chosen. */
export const ICON_MIN_WEIGHT_PX = 16
const LIGHT_WEIGHTS: ReadonlySet<PhosphorWeight> = new Set(['thin', 'light'])

export function effectiveIconWeight(weight: PhosphorWeight, px: number): PhosphorWeight {
  return px < ICON_MIN_WEIGHT_PX && LIGHT_WEIGHTS.has(weight) ? 'regular' : weight
}

/** CSS custom-property declarations: the scale aliases Dimension primitives,
 *  the roles alias the scale. Same "semantic → primitive" shape as every other
 *  length the exporters write. */
export function iconSizeCssVars(
  sizes: Record<string, string> | undefined,
  bodySize: string | undefined,
): string[] {
  const roles = resolveIconRoles(sizes, bodySize)
  return [
    ...ICON_SIZE_STEPS.map((step) => `  --icon-size-${step}: var(--dimension-${ICON_SIZE_SCALE[step]});`),
    ...ICON_ROLES.map((role) => `  --icon-${role}: var(--icon-size-${roles[role]});`),
  ]
}

/** The `tokens.json` block: scale in px, roles as step names, and the rule. */
export function iconSizeTokens(
  sizes: Record<string, string> | undefined,
  bodySize: string | undefined,
): {
  scale: Record<IconSizeStep, string>
  roles: Record<IconRole, IconSizeStep>
  minWeight: { belowPx: number; weight: PhosphorWeight }
} {
  return {
    scale: Object.fromEntries(ICON_SIZE_STEPS.map((s) => [s, `${ICON_SIZE_SCALE[s]}px`])) as Record<IconSizeStep, string>,
    roles: resolveIconRoles(sizes, bodySize),
    minWeight: { belowPx: ICON_MIN_WEIGHT_PX, weight: 'regular' },
  }
}
