import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { COMPONENTS } from '../componentCatalogue'
import { PREVIEW_COLOR_FIELDS } from '../previewColorFields'
import { COMPONENT_COLOR_FIELDS } from '../componentColorFields.generated'

const root = resolve(__dirname, '../../..')

describe('the generated component color-field map is current', () => {
  it('regenerating produces the committed file byte-for-byte', () => {
    // GENERATED data, same contract as radix/tailwind/carbon reference tables:
    // if `specimens.tsx` changes which PreviewTokens a specimen reads without
    // re-running the generator, this catches it instead of shipping a stale
    // (silently wrong) scoped Color section for that component.
    const path = resolve(root, 'src/lib/componentColorFields.generated.ts')
    const before = readFileSync(path, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-component-color-fields.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(path, 'utf8')).toBe(before)
  }, 60_000)

  it('every key is a real catalogue key and every field is an allow-listed color field', () => {
    const catalogueKeys = new Set(COMPONENTS.map((c) => c.key))
    const fieldSet = new Set(PREVIEW_COLOR_FIELDS)
    for (const [key, fields] of Object.entries(COMPONENT_COLOR_FIELDS)) {
      expect(catalogueKeys.has(key)).toBe(true)
      expect(fields.length).toBeGreaterThan(0)
      for (const f of fields) expect(fieldSet.has(f)).toBe(true)
    }
  })

  it('Button — a specimen with an explicit Color/Style/State axis — resolves brand and disabled fields', () => {
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('brandSolid')
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('onBrand')
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('disabledText')
  })

  it('Input binds the form-field surface, not the page', () => {
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('inputSurface')
  })

  it('TabMenu binds the selected-tab surface', () => {
    expect(COMPONENT_COLOR_FIELDS.TabMenu).toContain('selectedSurface')
  })

  it('TextLink binds the link roles, not accent copy', () => {
    expect(COMPONENT_COLOR_FIELDS.TextLink).toContain('linkText')
  })

  it('Input hover/error strokes bind control roles, not text or the solid fill', () => {
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('borderHover')
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('borderCritical')
  })

  it('Chip selected bind the selection surface', () => {
    expect(COMPONENT_COLOR_FIELDS.Chip).toContain('selectedSurface')
  })

  it('Divider — a single hairline with no live axis — resolves only its border', () => {
    expect(COMPONENT_COLOR_FIELDS.Divider).toEqual(['borderDefault'])
  })
})
