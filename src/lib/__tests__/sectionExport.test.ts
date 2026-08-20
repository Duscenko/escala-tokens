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
