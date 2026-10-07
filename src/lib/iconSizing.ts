// ── Icon sizing ──────────────────────────────────────────────────────────────
// Three sizes, and only three. A glyph is small, medium or large — 24, 32, 40.
// The old ladder (control-sm … control-xl, inline, feature, derived from the
// control height × 0.42) put six roles in Dimension Semantics that all read
// the same number in every viewport. That was more vocabulary than a size.
//
// Each size aliases one Dimension primitive (`dimension-24` …). There is no
// second scale underneath the role: the role IS the size.
//
// Viewports: Desktop, Tablet and Mobile carry the SAME px. A control's height
// does not step down between those modes (unlike spacing and radius), and the
// icon inside it holds with the control. `iconSizePx(role, viewport)` takes
// the mode so a later change cannot update one column and leave the others.

import type { PhosphorWeight } from './phosphorIcons'

export const ICON_ROLES = ['small', 'medium', 'large'] as const
export type IconRole = (typeof ICON_ROLES)[number]

/** Published icon sizes, in px. On the Dimension primitive ladder. */
export const ICON_SIZE_PX: Record<IconRole, number> = {
  small: 24, medium: 32, large: 40,
}

export const ICON_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
export type IconViewport = (typeof ICON_VIEWPORTS)[number]

export const ICON_ROLE_DESCRIPTION: Record<IconRole, string> = {
  small: 'Small glyph — 24px. Compact controls and field icons.',
  medium: 'Medium glyph — 32px. The default control icon.',
  large: 'Large glyph — 40px. Large controls and feature icons.',
}

/** The px of an icon size in a viewport. Every viewport returns the same
 *  number: the glyph does not step. */
export function iconSizePx(role: IconRole, _viewport: IconViewport = 'desktop'): number {
  return ICON_SIZE_PX[role]
}

/** Which of the three sizes a control of height `h` uses, so the glyph stays
 *  inside the control: under 40px → 24, under 48px → 32, otherwise 40. */
export function iconRoleForHeight(h: number): IconRole {
  if (!Number.isFinite(h) || h < 40) return 'small'
  if (h < 48) return 'medium'
  return 'large'
}

/** Button / input size steps → one of the three icon sizes. */
export function iconRoleForControlStep(step: string): IconRole {
  if (step === 'xs' || step === 'sm') return 'small'
  if (step === 'md') return 'medium'
  return 'large'
}

// ── Minimum weight for small icons ───────────────────────────────────────────
// Below 16px a thin or light stroke washes out. The three published sizes are
// all above that; anatomy glyphs (a 12px chevron) still pass through here.

export const ICON_MIN_WEIGHT_PX = 16
const LIGHT_WEIGHTS: ReadonlySet<PhosphorWeight> = new Set(['thin', 'light'])

export function effectiveIconWeight(weight: PhosphorWeight, px: number): PhosphorWeight {
  return px < ICON_MIN_WEIGHT_PX && LIGHT_WEIGHTS.has(weight) ? 'regular' : weight
}

/** Anatomy glyphs that are not a published size (a chevron, a close mark)
 *  snap to this ladder. They are not roles and they are not in Figma. */
const ANATOMY_PX = [12, 14, 16, 20, 24, 32] as const

export function anatomyIconPx(px: number): number {
  let best: number = ANATOMY_PX[0]
  let bestDiff = Infinity
  for (const step of ANATOMY_PX) {
    const diff = Math.abs(step - px)
    if (diff < bestDiff || (diff === bestDiff && step > best)) {
      best = step
      bestDiff = diff
    }
  }
  return best
}

/** CSS: each size aliases its Dimension primitive. One declaration, every
 *  viewport — the values do not differ, so there is no tablet/mobile override. */
export function iconSizeCssVars(): string[] {
  return ICON_ROLES.map((role) => `  --icon-${role}: var(--dimension-${ICON_SIZE_PX[role]});`)
}

export interface IconSizeViewportMap {
  desktop: Record<IconRole, string>
  tablet: Record<IconRole, string>
  mobile: Record<IconRole, string>
}

/** The `tokens.json` block. `scale` and `roles` name the same three sizes
 *  (the role points at the scale step of the same name). `viewports` repeats
 *  the px per mode so a consumer can see that Tablet and Mobile hold. */
export function iconSizeTokens(): {
  scale: Record<IconRole, string>
  roles: Record<IconRole, IconRole>
  viewports: IconSizeViewportMap
  minWeight: { belowPx: number; weight: PhosphorWeight }
} {
  const px = (role: IconRole, viewport: IconViewport) => `${iconSizePx(role, viewport)}px`
  const at = (viewport: IconViewport) =>
    Object.fromEntries(ICON_ROLES.map((role) => [role, px(role, viewport)])) as Record<IconRole, string>
  return {
    scale: Object.fromEntries(ICON_ROLES.map((role) => [role, `${ICON_SIZE_PX[role]}px`])) as Record<IconRole, string>,
    roles: Object.fromEntries(ICON_ROLES.map((role) => [role, role])) as Record<IconRole, IconRole>,
    viewports: { desktop: at('desktop'), tablet: at('tablet'), mobile: at('mobile') },
    minWeight: { belowPx: ICON_MIN_WEIGHT_PX, weight: 'regular' },
  }
}
