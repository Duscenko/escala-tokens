import { describe, expect, it } from 'vitest'
import { ALL_WIZARD_COLLECTIONS, buildWizardExport, type WizardSelection } from '../exportWizard'

const base: WizardSelection = {
  collections: ALL_WIZARD_COLLECTIONS,
  modes: ['light'],
  format: 'escala',
  structure: 'single',
  colorFormat: 'hex',
  includeAliases: true,
  includeComponents: true,
}

const parse = (sel: WizardSelection) => JSON.parse(buildWizardExport(sel)[0].content) as { viewports?: string[] }

describe('Escala JSON for Figma without Pro', () => {
  it('ships all three viewports by default, exactly as before', () => {
    expect(parse(base).viewports).toEqual(['desktop', 'tablet', 'mobile'])
  })

  it('ships Desktop only when the free scope is applied', () => {
    expect(parse({ ...base, figmaScope: { viewports: ['desktop'] } }).viewports).toEqual(['desktop'])
  })

  it('leaves other formats untouched by the scope', () => {
    const w3c = buildWizardExport({ ...base, format: 'w3c', figmaScope: { viewports: ['desktop'] } })
    expect(w3c.length).toBeGreaterThan(0)
    expect(w3c[0].content).not.toContain('"viewports"')
  })
})
