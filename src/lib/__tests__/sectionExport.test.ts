import { describe, expect, it, beforeEach } from 'vitest'
import { buildSectionExport } from '../sectionExport'
import { useDesignStore } from '../../store/useDesignStore'

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
