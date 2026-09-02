import { describe, expect, it } from 'vitest'
import {
  FAMILY_EXPORT_FORMATS,
  FAMILY_FORMAT_OPTIONS,
  WIZARD_DESTINATIONS,
  WIZARD_FORMATS,
  buildWizardExport,
  isAiFormat,
  wizardFormatLabel,
} from '../exportWizard'

describe('wizard destinations, not file formats', () => {
  it('offers Figma, GitHub, code, and AI — not Markdown or Skill as peers', () => {
    expect(WIZARD_DESTINATIONS.map((d) => d.key)).toEqual(['escala', 'github', 'w3c', 'agent-bundle'])
    expect(WIZARD_FORMATS.map((d) => d.key)).toEqual(['escala', 'w3c', 'agent-bundle'])
    expect(WIZARD_DESTINATIONS.some((d) => d.key === 'github')).toBe(true)
    expect(WIZARD_DESTINATIONS.map((d) => d.key)).not.toContain('md')
    expect(WIZARD_DESTINATIONS.map((d) => d.key)).not.toContain('skill')
  })

  it('labels destinations, not jargon', () => {
    expect(wizardFormatLabel('escala')).toBe('Figma')
    expect(wizardFormatLabel('w3c')).toBe('Code & other tools')
    expect(wizardFormatLabel('agent-bundle')).toBe('AI assistant')
    expect(wizardFormatLabel('skill')).toBe('AI assistant · Figma Make')
  })

  it('treats Skill as an AI format, not a destination', () => {
    expect(isAiFormat('agent-bundle')).toBe(true)
    expect(isAiFormat('skill')).toBe(true)
    expect(isAiFormat('escala')).toBe(false)
    expect(isAiFormat('w3c')).toBe(false)
  })

  it('keeps Markdown on the per-column family menu', () => {
    expect(FAMILY_EXPORT_FORMATS).toEqual(['w3c', 'escala', 'md'])
    expect(FAMILY_FORMAT_OPTIONS.map((f) => f.key)).toEqual(['w3c', 'escala', 'md'])
  })

  it('still builds the smaller Skill zip when the nested control asks for it', () => {
    const files = buildWizardExport({
      collections: [],
      modes: ['light', 'dark'],
      format: 'skill',
      structure: 'single',
      colorFormat: 'hex',
      includeAliases: true,
      includeComponents: false,
    })
    expect(files).toHaveLength(1)
    expect(files[0]!.name).toMatch(/\.zip$/)
    expect(files[0]!.name).not.toContain('agent-bundle')
  })
})
