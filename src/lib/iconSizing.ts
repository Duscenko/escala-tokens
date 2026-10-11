// ── Icon sizing ──────────────────────────────────────────────────────────────
// Three sizes, and only three. A glyph is small, medium or large — 16, 20, 24 at the
// reference control, i.e. about half the height of the control it sits in.
// The old ladder (control-sm … control-xl, inline, feature, derived from the
// control height × 0.42) put six roles in Dimension Semantics that all read
// the same number in every viewport. That was more vocabulary than a size.
//
// Each size aliases one Dimension primitive (`dimension-16` …). There is no
// second scale underneath the role: the role IS the size.
//
// Viewports: Desktop, Tablet and Mobile carry the SAME px. A control's height
// does not step down between those modes (unlike spacing and radius), and the
// icon inside it holds with the control. `iconSizePx(role, viewport)` takes
// the mode so a later change cannot update one column and leave the others.

import type { PhosphorWeight } from './phosphorIcons'

export const ICON_ROLES = ['small', 'medium', 'large'] as const
export type IconRole = (typeof ICON_ROLES)[number]

/** Published icon sizes at the REFERENCE control (md = 40px), in px. This is
 *  what a system with default controls ships; `iconSizesFor` scales it. */
export const ICON_SIZE_PX: Record<IconRole, number> = {
  small: 16, medium: 20, large: 24,
}

/** The md control height the 16 / 20 / 24 triple was drawn against. */
export const ICON_REFERENCE_CONTROL_PX = 40

/** The md control height of a `sizes` map (`{ md: '40px', … }`). */
export function controlMdOf(sizes?: Record<string, string> | null): number {
  const n = parseFloat(sizes?.md ?? '')
  return Number.isFinite(n) && n > 0 ? n : ICON_REFERENCE_CONTROL_PX
}

/** The three icon sizes for a system whose md control is `controlMd` tall.
 *  Icons keep their proportion to the controls they sit in: larger buttons
 *  and fields get larger glyph options, smaller ones smaller. Even px, on the
 *  Dimension ladder (every value is pinned there); at the reference control
 *  the result is exactly 16 · 20 · 24. */
export function iconSizesFor(controlMd: number | Record<string, string> | null | undefined = ICON_REFERENCE_CONTROL_PX): Record<IconRole, number> {
  const md = typeof controlMd === 'number' ? controlMd : controlMdOf(controlMd)
  const k = Math.min(1.6, Math.max(0.6, (Number.isFinite(md) && md > 0 ? md : ICON_REFERENCE_CONTROL_PX) / ICON_REFERENCE_CONTROL_PX))
  const out = {} as Record<IconRole, number>
  for (const role of ICON_ROLES) out[role] = Math.max(12, Math.round((ICON_SIZE_PX[role] * k) / 2) * 2)
  return out
}

export const ICON_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
export type IconViewport = (typeof ICON_VIEWPORTS)[number]

export const ICON_ROLE_DESCRIPTION: Record<IconRole, string> = {
  small: 'Small glyph — compact controls and field icons. About half the control height.',
  medium: 'Medium glyph — the default control icon. Scales with the control height.',
  large: 'Large glyph — large controls and feature icons. Scales with the control height.',
}

/** The px of an icon size in a viewport. Every viewport returns the same
 *  number: the glyph does not step. */
export function iconSizePx(role: IconRole, _viewport: IconViewport = 'desktop', controlMd?: number | Record<string, string> | null): number {
  return iconSizesFor(controlMd)[role]
}

/** Which of the three sizes a control of height `h` uses, so the glyph stays
 *  inside the control: below the md control → small, up to 1.2× md → medium,
 *  otherwise large (under 40 / 48px at the reference control). */
export function iconRoleForHeight(h: number, controlMd: number = ICON_REFERENCE_CONTROL_PX): IconRole {
  if (!Number.isFinite(h) || h < controlMd) return 'small'
  if (h < controlMd * 1.2) return 'medium'
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
export function iconSizeCssVars(controlMd?: number | Record<string, string> | null): string[] {
  const px = iconSizesFor(controlMd)
  return ICON_ROLES.map((role) => `  --icon-${role}: var(--dimension-${px[role]});`)
}

export interface IconSizeViewportMap {
  desktop: Record<IconRole, string>
  tablet: Record<IconRole, string>
  mobile: Record<IconRole, string>
}

/** The `tokens.json` block. `scale` and `roles` name the same three sizes
 *  (the role points at the scale step of the same name). `viewports` repeats
 *  the px per mode so a consumer can see that Tablet and Mobile hold. */
export function iconSizeTokens(controlMd?: number | Record<string, string> | null): {
  scale: Record<IconRole, string>
  roles: Record<IconRole, IconRole>
  viewports: IconSizeViewportMap
  minWeight: { belowPx: number; weight: PhosphorWeight }
} {
  const sizes = iconSizesFor(controlMd)
  const px = (role: IconRole, _viewport: IconViewport) => `${sizes[role]}px`
  const at = (viewport: IconViewport) =>
    Object.fromEntries(ICON_ROLES.map((role) => [role, px(role, viewport)])) as Record<IconRole, string>
  return {
    scale: Object.fromEntries(ICON_ROLES.map((role) => [role, `${sizes[role]}px`])) as Record<IconRole, string>,
    roles: Object.fromEntries(ICON_ROLES.map((role) => [role, role])) as Record<IconRole, IconRole>,
    viewports: { desktop: at('desktop'), tablet: at('tablet'), mobile: at('mobile') },
    minWeight: { belowPx: ICON_MIN_WEIGHT_PX, weight: 'regular' },
  }
}
