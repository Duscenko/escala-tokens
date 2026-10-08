import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { buildCSS } from '../exporters'
import { ALL_WIZARD_COLLECTIONS, buildWizardExport, type WizardSelection } from '../exportWizard'
import type { FigmaScope } from '../freeFigmaScope'

const base: WizardSelection = {
  collections: ALL_WIZARD_COLLECTIONS,
  modes: ['light'],
  format: 'escala',
  structure: 'single',
  colorFormat: 'hex',
  includeAliases: true,
  includeComponents: true,
}

const freeScope: FigmaScope = {
  viewports: ['desktop'],
  gridStyles: ['xl-desktop'],
  themes: ['light'],
  modes: [{ theme: 'light', appearance: 'light' }],
}

const parse = (sel: WizardSelection) => JSON.parse(buildWizardExport(sel)[0].content) as {
  viewports?: string[]
  typography?: { role: Record<string, Record<string, unknown>> }
  grid?: { breakpoint: Record<string, unknown>; frame: Record<string, unknown> }
}

describe('Escala JSON for Figma without Pro', () => {
  it('ships all three viewports by default, exactly as before', () => {
    expect(parse(base).viewports).toEqual(['desktop', 'tablet', 'mobile'])
  })

  it('ships Desktop only when the free scope is applied', () => {
    expect(parse({ ...base, figmaScope: { viewports: ['desktop'] } }).viewports).toEqual(['desktop'])
  })

  it('cuts W3C to Desktop roles and frames', () => {
    const open = parse({ ...base, format: 'w3c' })
    expect(open.grid?.breakpoint.mobile).toBeDefined()
    const cut = parse({ ...base, format: 'w3c', figmaScope: freeScope })
    expect(cut.grid?.breakpoint.mobile).toBeUndefined()
    expect(Object.keys(cut.grid?.frame ?? {})).toEqual(['desktop'])
    for (const role of Object.values(cut.typography?.role ?? {})) {
      expect(Object.keys(role)).toEqual(['desktop'])
    }
  })

  it('cuts Markdown the same way', () => {
    const md = buildWizardExport({ ...base, format: 'md', figmaScope: freeScope })[0].content
    expect(md).not.toMatch(/\|\s*Tablet\s*\|/)
    expect(md).not.toMatch(/\|\s*Mobile\s*\|/)
  })

  it('drops viewport media from CSS when desktopOnly', () => {
    const store = useDesignStore.getState()
    expect(buildCSS(store)).toContain('@media (max-width')
    expect(buildCSS(store, { desktopOnly: true })).not.toContain('@media (max-width')
  })
})
