import { describe, expect, it, beforeEach } from 'vitest'
import { buildSectionExport } from '../sectionExport'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore, makeDesignDefaults } from '../../store/useDesignStore'
import { generateColorScale, generateFamilyDarkScale } from '../colorUtils'

describe('buildSectionExport color markdown', () => {
  beforeEach(() => {
    useDesignStore.setState({
      semanticArchitecture: 'categorical',
      themeOrder: ['light', 'dark'],
      themes: { light: {}, dark: {} },
    })
  })

  it('exports categorical semantic groups with nested role ids', () => {
    const md = buildSectionExport('color', 'md', 'hex', { modes: ['light', 'dark'] })
    expect(md).toContain('### Semantic (Categorical)')
    expect(md).toContain('#### Content')
    expect(md).toContain('`content.primary`')
    expect(md).toContain('`action.primary.default`')
    expect(md).toContain('`status.critical.content`')
    expect(md).toContain('`border.strong`')
    expect(md).toContain('Primitive · light')
    expect(md).toContain('Primitive · dark')
  })

  it('does not ship flat catalogue tokens when categorical is active', () => {
    const md = buildSectionExport('color', 'md', 'hex', { modes: ['light', 'dark'] })
    expect(md).not.toContain('### Semantic (Light)')
    expect(md).not.toContain('`content-primary`')
  })
})

/** The Markdown color section and tokens.json are two renderings of ONE system,
 *  so they must name the SAME primitive tokens. They didn't: `colorFamilies`
 *  shipped light ramps only unless a call explicitly asked for 'dark', which
 *  silently dropped every `*-dark` twin from the `.MD` pane, the wizard's
 *  Markdown file and "Copy Page" — 84 tokens documented against 168 exported.
 *  Asserted as a SET rather than a count so a future family lands in both or
 *  fails here. */
describe('buildSectionExport color markdown ↔ tokens.json', () => {
  function seedTwoAppearanceSystem(overrides: Record<string, unknown> = {}) {
    const defaults = makeDesignDefaults()
    const light = generateColorScale('#9522e9', 'default', 0, defaults.pageBackground)
    const dark = generateFamilyDarkScale('#9522e9', 'default', 0, defaults.darkBackground)
    useDesignStore.setState({
      ...defaults,
      primaryScale: light, primaryDarkScale: dark,
      errorScale: light, errorDarkScale: dark,
      warningScale: light, warningDarkScale: dark,
      successScale: light, successDarkScale: dark,
      infoScale: light, infoDarkScale: dark,
      // A custom family stands in for one minted by "+ Theme" — its dark twin
      // is exactly the case a theme's own accent ramp falls into.
      customColors: [{ key: 'teal', label: 'Teal', base: '#14b8a6', scale: light, darkScale: dark }],
      ...overrides,
    } as never)
  }

  /** Primitive token names from the Markdown tables above the Semantic block. */
  function mdPrimitives(md: string): Set<string> {
    return new Set([...md.split('### Semantic')[0].matchAll(/^\| `([a-z0-9-]+)` \| `#/gm)].map((m) => m[1]))
  }

  it('documents every primitive tokens.json ships, dark twins included', () => {
    seedTwoAppearanceSystem()
    const store = useDesignStore.getState()
    const md = buildSectionExport('color', 'md', 'hex', {
      modes: store.themeOrder.filter((t) => store.themes[t]),
    })
    const shipped = new Set(Object.keys(generateTokenJSON().colors.primitive))

    expect([...shipped].filter((t) => !mdPrimitives(md).has(t))).toEqual([])
    expect([...mdPrimitives(md)].filter((t) => !shipped.has(t))).toEqual([])
    expect(mdPrimitives(md).has('accent-dark-9')).toBe(true)
    expect(mdPrimitives(md).has('teal-dark-9')).toBe(true)
  })

  it('adds no dark twin to a system that has no dark theme', () => {
    seedTwoAppearanceSystem({ themeOrder: ['light'], themes: { light: {} }, themeKinds: { light: 'light' } })
    const md = buildSectionExport('color', 'md', 'hex', { modes: ['light'] })
    expect([...mdPrimitives(md)].some((t) => t.includes('-dark-'))).toBe(false)
    expect(mdPrimitives(md).has('accent-9')).toBe(true)
  })

  it('an explicit appearance still scopes to that one — the per-column export', () => {
    seedTwoAppearanceSystem()
    const darkOnly = mdPrimitives(buildSectionExport('color', 'md', 'hex', { appearance: 'dark', includeSemantics: false }))
    expect([...darkOnly].every((t) => t.includes('-dark-'))).toBe(true)

    const oneFamily = mdPrimitives(buildSectionExport('color', 'md', 'hex', { appearance: 'light', families: ['accent'], includeSemantics: false }))
    expect([...oneFamily].every((t) => t.startsWith('accent-'))).toBe(true)
  })
})

describe('buildSectionExport grid', () => {
  it('CSS aliases breakpoint primitives and emits a resolved mobile media query', () => {
    const css = buildSectionExport('grid', 'css')
    expect(css).toContain('--breakpoint-md: 768px;')
    expect(css).toContain('--breakpoint-desktop: var(--breakpoint-md);')
    expect(css).toContain('--breakpoint-mobile: calc(var(--breakpoint-md) - 1px);')
    expect(css).toContain('--grid-columns: 12;')
    expect(css).toContain('--grid-gutter: var(--spacing-6);')
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('--grid-columns: 4;')
    expect(css).not.toMatch(/@media \(max-width: var\(--breakpoint/)
    expect(css).not.toMatch(/--breakpoint-mobile:\s*767/)
  })

  it('markdown documents viewport roles and both frame recipes', () => {
    const md = buildSectionExport('grid', 'md')
    expect(md).toContain('`--breakpoint-desktop`')
    expect(md).toContain('`--breakpoint-mobile`')
    expect(md).toContain('`var(--spacing-6)`')
    expect(md).toContain('`var(--spacing-4)`')
    expect(md).toContain('`var(--breakpoint-xl)`')
  })
})
