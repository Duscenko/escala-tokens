import { describe, expect, it } from 'vitest'
import { TYPE_SCALE_KEYS } from '../typographyStandard'
import {
  TYPE_ROLES,
  TYPE_ROLE_GROUPS,
  aliasesEqual,
  mergeTypeRoles,
  migrateHeadingFamilyToBody,
  promoteReadingTypeIdentity,
  typePrimitivesForViewport,
  primitiveVar,
  resolveTypeStyle,
  roleIsDefault,
  stepLargeTypeOnMobile,
  typeRoleCssVars,
  typeRoleVar,
  typeStyleCss,
} from '../typeRoles'

const primitives = {
  fontFamily: 'Inter',
  headingFontFamily: 'Inter',
  sizes: Object.fromEntries(TYPE_SCALE_KEYS.map((k) => [k, '16px'])),
  lineHeights: Object.fromEntries(TYPE_SCALE_KEYS.map((k) => [k, '24px'])),
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
}

describe('type roles', () => {
  it('catalogues fourteen roles across four groups, each with desktop and mobile aliases', () => {
    expect(TYPE_ROLE_GROUPS).toHaveLength(4)
    expect(TYPE_ROLES).toHaveLength(14)
    const sizes = new Set<string>(TYPE_SCALE_KEYS)
    for (const role of TYPE_ROLES) {
      expect(sizes.has(role.desktop.size)).toBe(true)
      expect(sizes.has(role.mobile.size)).toBe(true)
      expect(['display', 'body']).toContain(role.desktop.family)
      expect(['regular', 'medium', 'semibold', 'bold']).toContain(role.desktop.weight)
    }
    expect(TYPE_ROLES.some((r) => r.key === 'label')).toBe(true)
    expect(TYPE_ROLES.some((r) => r.key === 'placeholder')).toBe(true)
  })

  it('only the display role aliases the heading font family', () => {
    for (const role of TYPE_ROLES) {
      expect(role.desktop.family).toBe(role.key === 'display' ? 'display' : 'body')
    }
  })

  it('body and control aliases are the same on desktop and mobile; display and headings step', () => {
    for (const role of TYPE_ROLES) {
      if (role.group === 'display' || role.group === 'heading') {
        expect(aliasesEqual(role.desktop, role.mobile)).toBe(false)
      } else {
        expect(aliasesEqual(role.desktop, role.mobile)).toBe(true)
      }
    }
  })

  it('lists the primitive size steps each platform cut actually aliases', () => {
    const desktop = typePrimitivesForViewport(undefined, 'desktop')
    const mobile = typePrimitivesForViewport(undefined, 'mobile')
    expect(desktop.sizes.has('display-xl')).toBe(true)
    expect(mobile.sizes.has('display-xl')).toBe(false)
    expect(desktop.sizes.has('display-2xl')).toBe(false)
    expect(mobile.sizes.has('display-2xl')).toBe(false)
    expect(desktop.families.has('display') && desktop.families.has('body')).toBe(true)
    expect(desktop.weights.has('semibold')).toBe(true)
  })

  it('seeds missing roles and keeps a user edit', () => {
    const stored = mergeTypeRoles({
      label: {
        desktop: { family: 'body', size: 'text-lg', weight: 'bold' },
        mobile: { family: 'body', size: 'text-sm', weight: 'bold' },
      },
    })
    expect(stored.label.desktop.size).toBe('text-lg')
    expect(stored.label.desktop.weight).toBe('bold')
    expect(stored.placeholder.desktop.size).toBe('text-md')
    expect(Object.keys(stored)).toHaveLength(TYPE_ROLES.length)
  })

  it('drops unknown keys and repairs a broken alias', () => {
    const stored = mergeTypeRoles({
      madeUp: { desktop: { family: 'body', size: 'text-sm', weight: 'regular' }, mobile: { family: 'body', size: 'text-xs', weight: 'regular' } },
      label: { desktop: { family: 'body', size: 'nope', weight: 'regular' } as never, mobile: { family: 'body', size: 'text-xs', weight: 'medium' } },
    } as never)
    expect(stored.madeUp).toBeUndefined()
    expect(stored.label.desktop.size).toBe('text-sm')
    expect(roleIsDefault('label', stored.label)).toBe(true)
  })

  it('promotes the pre-v73 body/control shrink and leaves a hand-picked mobile size', () => {
    const promoted = promoteReadingTypeIdentity({
      'body-md': {
        desktop: { family: 'body', size: 'text-md', weight: 'regular' },
        mobile: { family: 'body', size: 'text-sm', weight: 'regular' },
      },
      label: {
        desktop: { family: 'body', size: 'text-sm', weight: 'medium' },
        mobile: { family: 'body', size: 'text-xs', weight: 'bold' },
      },
    })
    expect(promoted['body-md'].mobile.size).toBe('text-md')
    expect(promoted.label.mobile.size).toBe('text-xs')
    expect(promoted.label.mobile.weight).toBe('bold')
    expect(roleIsDefault('body-md', promoted['body-md'])).toBe(true)
  })

  it('resolves an alias through the primitive ramp', () => {
    const style = resolveTypeStyle(
      { family: 'display', size: 'display-sm', weight: 'semibold' },
      { ...primitives, sizes: { ...primitives.sizes, 'display-sm': '30px' }, lineHeights: { ...primitives.lineHeights, 'display-sm': '38px' } },
    )
    expect(style.size).toBe('30px')
    expect(style.lineHeight).toBe('38px')
    expect(style.weight).toBe(600)
    expect(style.family).toBe('Inter')
  })

  it('aliases CSS vars onto primitive tokens, not raw px', () => {
    expect(typeRoleVar('label', 'size')).toBe('--text-label-font-size')
    expect(typeRoleVar('label', 'size', 'mobile')).toBe('--text-label-font-size-mobile')
    expect(primitiveVar({ family: 'body', size: 'text-sm', weight: 'medium' }, 'size')).toBe('var(--font-size-text-sm)')
    expect(primitiveVar({ family: 'display', size: 'display-xl', weight: 'bold' }, 'family')).toBe('var(--font-family-heading)')
    expect(aliasesEqual(
      { family: 'body', size: 'text-sm', weight: 'medium' },
      { family: 'body', size: 'text-sm', weight: 'medium' },
    )).toBe(true)
  })
})

describe('typeStyleCss (preview / docs / components)', () => {
  it('resolves a text role through the live primitive maps', () => {
    const stored = {
      label: {
        desktop: { family: 'body' as const, size: 'text-sm' as const, weight: 'medium' as const },
        mobile: { family: 'body' as const, size: 'text-xs' as const, weight: 'medium' as const },
      },
    }
    const ty = { ...primitives, sizes: { ...primitives.sizes, 'text-sm': '14px', 'text-xs': '12px' }, lineHeights: { ...primitives.lineHeights, 'text-sm': '20px', 'text-xs': '16px' } }
    const desktop = typeStyleCss(ty, stored, 'label', { leading: false })
    expect(desktop.size).toBe('14px')
    expect(desktop.weight).toBe(500)
    expect(desktop.lineHeight).toBeUndefined()
    const mobile = typeStyleCss(ty, stored, 'label', { viewport: 'mobile', leading: true })
    expect(mobile.size).toBe('12px')
    expect(mobile.lineHeight).toBe('16px')
  })
})

// ── Type-scale modes (rail quick setting) ──────────────────────────────────
import {
  TYPE_SCALE_MODES,
  TYPE_SCALE_RATIOS,
  buildTypeScale,
  buildModularTypeScale,
  inferTypeScaleMode,
  FONT_SIZE_STANDARD,
  LINE_HEIGHT_STANDARD,
} from '../typographyStandard'

describe('type-scale modes', () => {
  it('Default is FONT_SIZE_STANDARD verbatim — a no-op for existing systems', () => {
    const built = buildTypeScale(1)
    expect(built.sizes).toEqual(FONT_SIZE_STANDARD)
    expect(built.lineHeights).toEqual(LINE_HEIGHT_STANDARD)
    expect(inferTypeScaleMode(FONT_SIZE_STANDARD)).toBe('default')
  })

  it('every mode round-trips through inference', () => {
    for (const mode of TYPE_SCALE_MODES) {
      expect(inferTypeScaleMode(buildTypeScale(mode.factor).sizes)).toBe(mode.key)
    }
  })

  it('a hand-edited size map matches no mode → "Custom"', () => {
    expect(inferTypeScaleMode({ ...FONT_SIZE_STANDARD, 'text-md': '17px' })).toBeNull()
    expect(inferTypeScaleMode(undefined)).toBeNull()
    expect(inferTypeScaleMode({})).toBeNull()
  })

  it('modes are strictly ordered and never collapse an adjacent step', () => {
    const md = TYPE_SCALE_MODES.map((m) => parseFloat(buildTypeScale(m.factor).sizes['text-md']))
    for (let i = 1; i < md.length; i++) expect(md[i]).toBeGreaterThan(md[i - 1])
    // No two adjacent text-* steps within a mode land on the same px.
    for (const mode of TYPE_SCALE_MODES) {
      const s = buildTypeScale(mode.factor).sizes
      const text = ['text-xs', 'text-sm', 'text-md', 'text-lg', 'text-xl'].map((k) => parseFloat(s[k]))
      for (let i = 1; i < text.length; i++) expect(text[i]).toBeGreaterThan(text[i - 1])
    }
  })

  it('a modular scale is strictly geometric around text-md', () => {
    const built = buildModularTypeScale(16, 1.25)
    expect(built.sizes['text-md']).toBe('16px')
    expect(parseFloat(built.sizes['text-lg']) / parseFloat(built.sizes['text-md'])).toBeCloseTo(1.25, 1)
    expect(parseFloat(built.sizes['text-sm']) / parseFloat(built.sizes['text-md'])).toBeCloseTo(1 / 1.25, 1)
    for (const ratio of TYPE_SCALE_RATIOS) {
      const steps = TYPE_SCALE_KEYS.map((key) => parseFloat(buildModularTypeScale(16, ratio).sizes[key]))
      for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1])
    }
  })

  it('line-heights scale at the same factor, so the size→leading ratio holds', () => {
    for (const mode of TYPE_SCALE_MODES) {
      const built = buildTypeScale(mode.factor)
      const ratio = parseFloat(built.lineHeights['text-md']) / parseFloat(built.sizes['text-md'])
      const stdRatio = parseFloat(LINE_HEIGHT_STANDARD['text-md']) / parseFloat(FONT_SIZE_STANDARD['text-md'])
      expect(ratio).toBeCloseTo(stdRatio, 1)
    }
  })
})

describe('three platform cuts (v75)', () => {
  const rank = (size: string) => TYPE_SCALE_KEYS.indexOf(size as (typeof TYPE_SCALE_KEYS)[number])

  it('Display and Heading XL give three distinct sizes: tablet one rung down, mobile two', () => {
    for (const key of ['display', 'heading-xl']) {
      const role = TYPE_ROLES.find((r) => r.key === key)!
      expect(rank(role.desktop.size) - rank(role.tablet.size)).toBe(1)
      expect(rank(role.desktop.size) - rank(role.mobile.size)).toBe(2)
    }
  })

  it('smaller headings hold their desktop size on tablet and step one rung on mobile', () => {
    for (const role of TYPE_ROLES.filter((r) => r.group === 'heading' && r.key !== 'heading-xl')) {
      expect(aliasesEqual(role.tablet, role.desktop)).toBe(true)
      expect(rank(role.desktop.size) - rank(role.mobile.size)).toBe(1)
    }
  })

  it('body and control text keep ONE size on every cut', () => {
    for (const role of TYPE_ROLES.filter((r) => r.group === 'body' || r.group === 'control')) {
      expect(aliasesEqual(role.tablet, role.desktop)).toBe(true)
      expect(aliasesEqual(role.mobile, role.desktop)).toBe(true)
    }
  })

  it('weights never change across cuts', () => {
    for (const role of TYPE_ROLES) {
      expect(role.tablet.weight).toBe(role.desktop.weight)
      expect(role.mobile.weight).toBe(role.desktop.weight)
    }
  })

  it('tablet now resolves differently from desktop where it should', () => {
    const desk = typePrimitivesForViewport(null, 'desktop').sizes
    const tab = typePrimitivesForViewport(null, 'tablet').sizes
    expect([...desk].sort()).not.toEqual([...tab].sort())
  })

  it('a pre-v75 map (no tablet) seeds tablet by detection', () => {
    const legacy = {
      display: { desktop: { family: 'display', size: 'display-xl', weight: 'bold' }, mobile: { family: 'display', size: 'display-lg', weight: 'bold' } },
      'heading-xl': { desktop: { family: 'display', size: 'display-2xl', weight: 'semibold' }, mobile: { family: 'display', size: 'display-md', weight: 'semibold' } },
    }
    const map = mergeTypeRoles(legacy)
    // Default desktop → the catalogue tablet step.
    expect(map.display.tablet.size).toBe('display-lg')
    // Hand-picked desktop → tablet copies it (what tablet rendered before).
    expect(map['heading-xl'].tablet.size).toBe('display-2xl')
  })

  it('v75 moves the large mobile steps only where the pair is still the old default', () => {
    const legacy = {
      display: { desktop: { family: 'display', size: 'display-xl', weight: 'bold' }, mobile: { family: 'display', size: 'display-lg', weight: 'bold' } },
      'heading-xl': { desktop: { family: 'display', size: 'display-lg', weight: 'semibold' }, mobile: { family: 'display', size: 'display-lg', weight: 'semibold' } },
    }
    const map = stepLargeTypeOnMobile(legacy)
    expect(map.display.mobile.size).toBe('display-md')
    // A hand-picked mobile size is left alone.
    expect(map['heading-xl'].mobile.size).toBe('display-lg')
    expect(roleIsDefault('display', map.display)).toBe(true)
  })

  it('emits -tablet CSS vars beside desktop and -mobile', () => {
    const lines = typeRoleCssVars(null)
    expect(typeRoleVar('display', 'size', 'tablet')).toBe('--text-display-font-size-tablet')
    expect(lines).toContain('--text-display-font-size-tablet: var(--font-size-display-lg);')
    expect(lines).toContain('--text-display-font-size-mobile: var(--font-size-display-md);')
  })
})

describe('heading family defaults (v81)', () => {
  it('migrates catalogue-default heading aliases from display to body family', () => {
    const map = migrateHeadingFamilyToBody(null)
    expect(map['heading-xl'].desktop.family).toBe('body')
    expect(map.display.desktop.family).toBe('display')
    expect(typeRoleCssVars(null)).toContain('--text-heading-xl-font-family: var(--font-family-body);')
    expect(typeRoleCssVars(null)).toContain('--text-display-font-family: var(--font-family-heading);')
  })

  it('locks heading family to body even when a stored overlay still says display', () => {
    const custom = {
      'heading-md': {
        desktop: { family: 'display' as const, size: 'display-2xl' as const, weight: 'semibold' as const },
        mobile: { family: 'display' as const, size: 'display-xl' as const, weight: 'semibold' as const },
      },
      'heading-xl': {
        desktop: { family: 'display' as const, size: 'display-lg' as const, weight: 'semibold' as const },
        mobile: { family: 'display' as const, size: 'display-sm' as const, weight: 'semibold' as const },
      },
    }
    const map = mergeTypeRoles(custom)
    expect(map['heading-md'].desktop.family).toBe('body')
    expect(map['heading-md'].desktop.size).toBe('display-2xl')
    expect(map['heading-xl'].desktop.family).toBe('body')
    expect(map.display.desktop.family).toBe('display')
  })
})
