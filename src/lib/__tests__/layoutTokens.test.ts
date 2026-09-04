import { describe, expect, it } from 'vitest'
import {
  LAYOUT_ROLES,
  RADIUS_NESTING,
  concentricRadiusRoles,
  concentricRadiusStep,
  nestedRadius,
  radiusNestingReport,
  LAYOUT_PRIMITIVE_STEPS,
  PADDING_STANDARD,
  RADIUS_STANDARD,
  RADIUS_STEPS,
  SIZE_STANDARD,
  SPACING_STANDARD,
  SPACING_STEPS,
  STROKE_STANDARD,
  BREAKPOINT_STANDARD,
  BREAKPOINT_STEPS,
  GRID_FRAME_STANDARD,
  GRID_STANDARD,
  allLayoutRoleCssVars,
  buildSpacingFromBase,
  defaultLayoutRoles,
  layoutPrimitiveVar,
  layoutRoleIsDefault,
  layoutRoleVar,
  mergeGridFrame,
  mergeLayoutRoles,
  nearestSpacingStep,
  breakpointMobileMax,
  resolveGridFrame,
  resolveLayoutRole,
  scaleRadiusFromLg,
  completeRadiusScale,
  matchRadiusPreset,
  RADIUS_PRESETS,
  BASE_UNIT_RANGE,
  SELECTOR_STANDARD,
  SELECTOR_STEPS,
  SIZE_DEFAULT_BASE,
  SELECTOR_DEFAULT_BASE,
  buildSelectorsFromBase,
  buildSizesFromBase,
  hairlineSafe,
  inferSelectorBase,
  inferSizeBase,
  type LayoutFamily,
  LEGACY_RADIUS_ROLE_RUNGS,
  LEGACY_RADIUS_LG_FACTOR,
  RADIUS_GROUPS,
  radiusGroupStep,
  applyRadiusGroup,
} from '../layoutTokens'

const EVERY_BASE = (() => {
  const out: number[] = []
  for (let b = BASE_UNIT_RANGE.min; b <= BASE_UNIT_RANGE.max + 1e-9; b += BASE_UNIT_RANGE.step) out.push(b)
  return out
})()

describe('base-unit scaling', () => {
  // The whole feature rests on this: if the default base did NOT reproduce the
  // shipped ramp, adding the slider would silently restyle every system.
  it('the default field base reproduces SIZE_STANDARD exactly', () => {
    expect(buildSizesFromBase(SIZE_DEFAULT_BASE)).toEqual(SIZE_STANDARD)
  })

  it('the default selector base reproduces the values the specimens hardcoded', () => {
    expect(SELECTOR_DEFAULT_BASE).toBe(3)
    expect(SELECTOR_STANDARD).toEqual({
      xs: '12px', sm: '15px', md: '18px', lg: '21px', xl: '24px',
    })
    // 15 and 18 were `box = small ? 15 : 18` in CheckboxSpecimen/RadioSpecimen.
    expect(SELECTOR_STANDARD.sm).toBe('15px')
    expect(SELECTOR_STANDARD.md).toBe('18px')
  })

  it('every base in range round-trips through inference', () => {
    for (const base of EVERY_BASE) {
      expect(inferSizeBase(buildSizesFromBase(base)), `size @ ${base}`).toBeCloseTo(base, 10)
      expect(inferSelectorBase(buildSelectorsFromBase(base)), `selector @ ${base}`).toBeCloseTo(base, 10)
    }
  })

  it('a hand-edited ramp infers no base, so the UI can say "Custom"', () => {
    expect(inferSizeBase({ ...SIZE_STANDARD, lg: '50px' })).toBeNull()
    expect(inferSelectorBase({ ...SELECTOR_STANDARD, md: '19px' })).toBeNull()
    expect(inferSizeBase(undefined)).toBeNull()
    expect(inferSizeBase({})).toBeNull()
  })

  it('selector steps stay a 5-step glyph ramp, distinct from control heights', () => {
    expect(SELECTOR_STEPS).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
    // 24px is `size` xs but `selector` xl — the reason these are two ramps.
    expect(SELECTOR_STANDARD.xl).toBe(SIZE_STANDARD.xs)
  })

  it('hairlines are floored to 1px below 2dppx and left alone above it', () => {
    expect(hairlineSafe('0.5px', 1)).toBe('1px')
    expect(hairlineSafe('0.5px', 1.5)).toBe('1px')
    expect(hairlineSafe('0.5px', 2)).toBe('0.5px')
    expect(hairlineSafe('0.5px', 3)).toBe('0.5px')
    // Whole pixels and zero are never touched, at any density.
    expect(hairlineSafe('1px', 1)).toBe('1px')
    expect(hairlineSafe('2px', 1)).toBe('2px')
    expect(hairlineSafe('0px', 1)).toBe('0px')
  })
})

describe('layout primitives', () => {
  it('the standard radius ramp is Rounded, graded from lg 16', () => {
    expect(RADIUS_STEPS).toEqual(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'])
    // Rounded, not Sharp — see the note on `RADIUS_ROLES`. The roles moved down
    // two rungs in the same change, so the RESOLVED default is unchanged; the
    // next test pins that, which is the property that actually matters.
    expect(RADIUS_STANDARD).toEqual({
      none: '0px', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px',
      '2xl': '32px', '3xl': '48px', '4xl': '64px', full: '9999px',
    })
  })

  // The three axes resolve to a strictly increasing 4 · 8 · 16 ladder, and every
  // default sits ON `RADIUS_GROUP_STEPS` so each picker opens with its own value
  // selected rather than reading "Custom". `overlay` shares `container` because
  // the reference has ONE box radius for card and modal alike.
  it('the default system resolves the three-axis ladder', () => {
    const roles = defaultLayoutRoles('radius')
    const px = (role: string) => resolveLayoutRole('radius', roles, RADIUS_STANDARD, role)
    expect(px('control')).toBe('4px')
    expect(px('action')).toBe('8px')
    expect(px('container')).toBe('16px')
    expect(px('overlay')).toBe('16px')
    for (const group of RADIUS_GROUPS) {
      expect(radiusGroupStep(group, roles), group.key).not.toBeNull()
    }
  })

  // Each axis moves ONLY its own roles — the coupling this split exists to
  // remove. Picking a stadium selector must leave the card alone.
  it('an axis pick never moves another axis', () => {
    const boxes = RADIUS_GROUPS.find((g) => g.key === 'boxes')!
    const selectors = RADIUS_GROUPS.find((g) => g.key === 'selectors')!
    const base = defaultLayoutRoles('radius')
    const next = applyRadiusGroup(selectors, base, '2xl')
    expect(radiusGroupStep(selectors, next)).toBe('2xl')
    expect(radiusGroupStep(boxes, next)).toBe(radiusGroupStep(boxes, base))
    expect(next.action).toBe(base.action)
  })

  // The migration's correctness in one assertion: the new rungs are exactly
  // half the old ones, so re-grading a ramp `lg → 2×lg` reproduces every role's
  // pixels at every preset. If this fails, store v67 silently restyles systems.
  it('lg → 2×lg on the legacy rungs is value-identical to the new rungs', () => {
    for (const preset of RADIUS_PRESETS) {
      const lg = parseFloat(preset.values.lg)
      const before = scaleRadiusFromLg(lg)
      const after = scaleRadiusFromLg(lg * LEGACY_RADIUS_LG_FACTOR)
      // Compared against the v67 rungs LITERALLY, not against the current
      // defaults: the axis split moved them again afterwards, and what this
      // test exists to protect is the ramp arithmetic the migration relies on.
      const V67_RUNGS: Record<string, string> = { control: 'xs', action: 'lg', container: 'xl', overlay: '2xl' }
      for (const role of ['control', 'action', 'container', 'overlay'] as const) {
        const legacy = before[LEGACY_RADIUS_ROLE_RUNGS[role]]
        const next = after[V67_RUNGS[role]]
        expect(next, `${preset.label} ${role}`).toBe(legacy)
      }
    }
  })

  it('grades the radius ramp from lg using Tailwind / HeroUI ratios', () => {
    expect(scaleRadiusFromLg(8)).toMatchObject({
      xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px',
      '2xl': '16px', '3xl': '24px', '4xl': '32px',
    })
    expect(scaleRadiusFromLg(24)).toMatchObject({
      xs: '6px', sm: '12px', md: '18px', lg: '24px', xl: '36px',
      '2xl': '48px', '3xl': '72px', '4xl': '96px',
    })
  })

  it('named presets are points on the same formula, so slider and dropdown agree', () => {
    expect(matchRadiusPreset(RADIUS_STANDARD)).toBe('Rounded')
    for (const preset of RADIUS_PRESETS) {
      expect(matchRadiusPreset(preset.values)).toBe(preset.label)
      expect(preset.values).toMatchObject(scaleRadiusFromLg(parseFloat(preset.values.lg)))
    }
  })

  it('completeRadiusScale fills 2xl/3xl/4xl from lg without rewriting hand-edited steps', () => {
    const saved = {
      none: '0px', xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '9999px',
    }
    expect(completeRadiusScale(saved)).toEqual({
      none: '0px', xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px',
      '2xl': '48px', '3xl': '72px', '4xl': '96px', full: '9999px',
    })
    expect(matchRadiusPreset(completeRadiusScale(saved))).toBeNull()
    expect(completeRadiusScale({ ...saved, '2xl': '0px', '3xl': '0px' })['2xl']).toBe('48px')
  })

  it('spacing is a 4px grid including 0 and 5 (20px)', () => {
    expect(SPACING_STEPS).toEqual(['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'])
    expect(SPACING_STANDARD['0']).toBe('0px')
    expect(SPACING_STANDARD['5']).toBe('20px')
    expect(SPACING_STANDARD['16']).toBe('64px')
    expect(PADDING_STANDARD.top).toBe('20px')
    expect(buildSpacingFromBase(8)['5']).toBe('40px')
  })

  it('size stays on an 8px control ramp; stroke is 0/1/2/4', () => {
    expect(SIZE_STANDARD).toEqual({
      xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '56px', '2xl': '64px',
    })
    expect(STROKE_STANDARD).toEqual({ none: '0px', sm: '1px', md: '2px', lg: '4px' })
  })
})

describe('layout semantics', () => {
  it('default aliases only point at primitive steps', () => {
    const radius = defaultLayoutRoles('radius')
    expect(radius.action).toBe('sm')
    expect(radius.control).toBe('xs')
    expect(radius.container).toBe('lg')
    expect(radius.overlay).toBe('lg')
    expect(radius.pill).toBe('full')
    expect(defaultLayoutRoles('spacing')['inset-surface']).toBe('5')
    expect(defaultLayoutRoles('size').control).toBe('md')
    expect(defaultLayoutRoles('stroke').focus).toBe('md')
    expect(defaultLayoutRoles('stroke').divider).toBe('sm')
  })

  it('every default alias exists on that family\'s primitive scale', () => {
    // Read from LAYOUT_PRIMITIVE_STEPS, not a ternary chain per family: the
    // chain ended in a catch-all that silently checked any NEW family against
    // stroke's steps, so adding one produced a bogus failure rather than
    // coverage. This version covers every family the moment it's registered.
    for (const [family, roles] of Object.entries(LAYOUT_ROLES)) {
      const steps = new Set(LAYOUT_PRIMITIVE_STEPS[family as LayoutFamily])
      for (const role of roles) {
        expect(steps.has(role.primitive), `${family}-${role.key} → ${role.primitive}`).toBe(true)
      }
    }
  })

  it('merge keeps a valid edit, drops unknown keys, repairs a stale step', () => {
    const stored = mergeLayoutRoles('radius', {
      action: '2xl',
      madeUp: 'md',
      pill: 'nope',
    } as Record<string, string>)
    expect(stored.action).toBe('2xl')
    expect(stored.madeUp).toBeUndefined()
    expect(stored.pill).toBe('full')
    expect(Object.keys(stored)).toHaveLength(LAYOUT_ROLES.radius.length)
    expect(layoutRoleIsDefault('radius', 'action', '2xl')).toBe(false)
    expect(layoutRoleIsDefault('radius', 'pill', 'full')).toBe(true)
  })

  it('resolves through the primitive map, never inventing px', () => {
    const roles = mergeLayoutRoles('spacing', { 'inset-surface': '6' })
    expect(resolveLayoutRole('spacing', roles, SPACING_STANDARD, 'inset-surface')).toBe('24px')
    expect(resolveLayoutRole('radius', defaultLayoutRoles('radius'), RADIUS_STANDARD, 'action')).toBe('8px')
    expect(resolveLayoutRole('stroke', defaultLayoutRoles('stroke'), STROKE_STANDARD, 'focus')).toBe('2px')
  })

  it('CSS aliases primitive vars, not raw px', () => {
    expect(layoutRoleVar('radius', 'action')).toBe('--radius-action')
    expect(layoutPrimitiveVar('radius', 'md')).toBe('var(--radius-md)')
    const css = allLayoutRoleCssVars({
      radius: defaultLayoutRoles('radius'),
      spacing: defaultLayoutRoles('spacing'),
      size: defaultLayoutRoles('size'),
      stroke: defaultLayoutRoles('stroke'),
      breakpoint: defaultLayoutRoles('breakpoint'),
    }).join('\n')
    expect(css).toContain('--radius-action: var(--radius-sm);')
    expect(css).toContain('--spacing-inset-surface: var(--spacing-5);')
    expect(css).toContain('--size-control: var(--size-md);')
    expect(css).toContain('--stroke-focus: var(--stroke-md);')
    expect(css).toContain('--breakpoint-desktop: var(--breakpoint-md);')
    expect(css).toContain('--breakpoint-mobile: calc(var(--breakpoint-md) - 1px);')
    expect(css).not.toMatch(/--breakpoint-mobile:\s*767/)
    expect(css).not.toMatch(/--radius-action:\s*\d/)
  })

  it('nearest spacing step maps 20px onto 5', () => {
    expect(nearestSpacingStep(SPACING_STANDARD, 20)).toBe('5')
    expect(nearestSpacingStep(SPACING_STANDARD, 18)).toBe('5')
    expect(nearestSpacingStep(SPACING_STANDARD, 16)).toBe('4')
  })
})

describe('breakpoint + grid frame', () => {
  it('desktop aliases md; mobile max is 767 on the standard ramp', () => {
    expect(BREAKPOINT_STEPS).toEqual(['sm', 'md', 'lg', 'xl', '2xl'])
    expect(BREAKPOINT_STANDARD.md).toBe('768px')
    expect(defaultLayoutRoles('breakpoint').desktop).toBe('md')
    expect(defaultLayoutRoles('breakpoint').mobile).toBe('md')
    expect(breakpointMobileMax(defaultLayoutRoles('breakpoint'), BREAKPOINT_STANDARD)).toBe('767px')
  })

  it('desktop frame matches the previous global grid; mobile is 4-col', () => {
    expect(GRID_STANDARD.columns).toBe('12')
    expect(GRID_STANDARD.gutter).toBe('24px')
    expect(GRID_STANDARD.margin).toBe('32px')
    expect(GRID_STANDARD.container).toBe('1280px')
    const mobile = resolveGridFrame('mobile', GRID_FRAME_STANDARD, SPACING_STANDARD, BREAKPOINT_STANDARD)
    expect(mobile.columns).toBe(4)
    expect(mobile.gutter).toBe('16px')
    expect(mobile.margin).toBe('16px')
    expect(mobile.container).toBe('none')
  })

  it('merge repairs a stale container step', () => {
    const mixed = mergeGridFrame({
      desktop: { columns: '12', gutter: '6', margin: '8', container: 'nope' },
      mobile: { columns: '3', gutter: '4', margin: '4', container: 'none' },
    } as ReturnType<typeof mergeGridFrame>)
    expect(mixed.desktop.container).toBe('xl')
    expect(mixed.mobile.columns).toBe('4')
  })
})

// ── Concentric radius nesting ───────────────────────────────────────────────
// The relation that makes nested corners read as organic: inner = outer − the
// padding between them. The ratio ladder never encoded it, so `radius.control`
// satisfied it at exactly one point on the roundness slider, by coincidence.
describe('concentric radius nesting', () => {
  const spacing = SPACING_STANDARD
  const roles = defaultLayoutRoles('radius')
  const spacingRoles = defaultLayoutRoles('spacing')

  it('never returns a negative inner radius', () => {
    expect(nestedRadius(16, 12)).toBe(4)
    expect(nestedRadius(12, 12)).toBe(0)
    // Padding wider than the outer corner: the inner corner is square, not
    // negative. A negative would flow straight into a CSS value.
    expect(nestedRadius(8, 24)).toBe(0)
  })

  it('a 2xl card at inset-surface 20 nests a 12px inner — not the card\'s own 32', () => {
    // Glass / Playful boxes = 2xl (32). Default inset-surface is 20. Reusing
    // 32 on a short alert is the pill/pinch the collage was showing.
    expect(nestedRadius(32, 20)).toBe(12)
  })

  it('default card 16 with default inset 20 squares the inner', () => {
    expect(nestedRadius(16, 20)).toBe(0)
  })

  it('picks the roundest step that does not EXCEED the limit', () => {
    // Undershooting reads as a slightly tighter inner corner. Overshooting is
    // the collision, so the search may never land above the limit.
    const radius = scaleRadiusFromLg(16) // xs4 sm8 md12 lg16 xl24 2xl32 3xl48 4xl64
    // action = 2xl = 32, inset-control 12 → limit 20 → lg (16), never xl (24).
    expect(concentricRadiusStep(radius, '2xl', 12)).toBe('lg')
    const px = (step: string) => parseFloat(radius[step])
    expect(px(concentricRadiusStep(radius, '2xl', 12))).toBeLessThanOrEqual(20)
  })

  it('collapses to none when the padding swallows the corner', () => {
    expect(concentricRadiusStep(RADIUS_STANDARD, 'sm', 40)).toBe('none')
  })

  // `concentricRadiusRoles` steers `control` only while it is still ON the
  // concentric answer — its remaining job, used when the advanced editor
  // regrades the ramp. The three-axis model does NOT derive Selectors from
  // Fields (that would re-couple two axes; see `styleRadiusRoles`), so this is
  // opt-in by having picked the tracking value, not a default guarantee.
  it('re-derives control across a regrade only while it was tracking', () => {
    const insetPx = parseFloat(resolveLayoutRole('spacing', spacingRoles, spacing, 'inset-control'))
    for (const preset of RADIUS_PRESETS) {
      const tracking = { ...roles, control: concentricRadiusStep(RADIUS_STANDARD, roles.action, insetPx) }
      const next = concentricRadiusRoles(RADIUS_STANDARD, preset.values, tracking, spacing, spacingRoles)
      expect(next.control, preset.label).toBe(concentricRadiusStep(preset.values, roles.action, insetPx))
    }
  })

  it('leaves a hand-picked step alone', () => {
    // `4xl` is nobody's concentric answer, so the rule must not steer it back.
    const picked = { ...roles, control: '4xl' }
    const next = concentricRadiusRoles(RADIUS_STANDARD, RADIUS_PRESETS[3].values, picked, spacing, spacingRoles)
    expect(next.control).toBe('4xl')
  })

  it('reports the container-in-overlay collision instead of silently fixing it', () => {
    // `radius.container` is every card's radius system-wide, so constraining it
    // to a modal's padding would flatten cards nowhere near a modal. It stays a
    // report — but it must BE reported, because it fails at the default.
    // The pair is still only ever REPORTED, never silently repaired — that is
    // what this test guards. It no longer FAILS at the default, because Boxes is
    // one axis: `container` and `overlay` resolve to the same step, so a card
    // filling a modal can at worst equal it, never exceed it.
    const report = radiusNestingReport(RADIUS_STANDARD, roles, spacing, spacingRoles)
    const pair = report.find((r) => r.inner === 'container')!
    // Boxes is ONE axis, so container and overlay resolve to the same 16px —
    // and the pair still reports broken, because 20px of padding sits between
    // them and r_inner must clear r_outer − p. That is geometry, not a bug: a
    // card FILLING a modal body wants a square corner. It stays a report.
    expect(pair.innerPx).toBe(16)
    expect(pair.limitPx).toBe(0) // overlay 16 − inset-surface 20, floored
    expect(pair.broken).toBe(true)
    const after = concentricRadiusRoles(RADIUS_STANDARD, RADIUS_PRESETS[2].values, roles, spacing, spacingRoles)
    expect(after.container).toBe(roles.container)
  })

  it('only lists pairs that are genuinely flush', () => {
    // A button floating inside a card is not nested in this sense and must not
    // acquire a constraint it does not have.
    expect(RADIUS_NESTING.map((p) => `${p.inner} in ${p.outer}`)).toEqual([
      'control in action',
      'container in overlay',
    ])
  })
})
