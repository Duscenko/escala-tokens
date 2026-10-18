import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { COMPONENT_RECIPES } from '../componentRecipes'
import { rolesForComponent } from '../tokenInspector'
import { buildArchitectureView } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const roleIds = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
  pageBackground: system.lightBg, darkBackground: system.darkBg,
} as never, system.errorSeed)!.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`))

describe('every catalogue component is described by a recipe', () => {
  it('and only catalogue components have one', () => {
    const catalogueKeys = new Set(COMPONENTS.map((c) => c.key))
    for (const key of Object.keys(COMPONENT_RECIPES)) expect(catalogueKeys.has(key), key).toBe(true)
    const missing = COMPONENTS.filter((c) => !COMPONENT_RECIPES[c.key]).map((c) => c.key)
    expect(missing).toEqual([])
  })

  it('every role a recipe paints is a real Categorical role', () => {
    const valid = new Set(roleIds)
    for (const c of COMPONENTS) {
      for (const id of rolesForComponent(c.key)) expect(valid.has(id), `${c.key} → ${id}`).toBe(true)
    }
  })

  it('Button — Color/Style/State axes — resolves brand, label ink and disabled roles', () => {
    const roles = rolesForComponent('Button')
    expect(roles).toContain('action.primary.default')
    expect(roles).toContain('content.on-action')
    expect(roles).toContain('content.disabled')
  })

  it('Input binds the form-field surface, not the page', () => {
    expect(rolesForComponent('Input')).toContain('surface.input')
  })

  it('TabMenu binds the selected-tab surface', () => {
    expect(rolesForComponent('TabMenu')).toContain('surface.selected')
  })

  it('TextLink binds the link roles, not accent copy', () => {
    const roles = rolesForComponent('TextLink')
    expect(roles).toContain('content.link.default')
    expect(roles).toContain('content.link.hover')
  })

  it('Input hover/error strokes bind control roles, not text or the solid fill', () => {
    const roles = rolesForComponent('Input')
    expect(roles).toContain('border.control-hover')
    expect(roles).toContain('status.critical.border-strong')
  })

  it('Chip selected binds the selection surface', () => {
    expect(rolesForComponent('Chip')).toContain('surface.selected')
  })

  it('Divider — a single hairline with no live axis — resolves only its border', () => {
    expect(rolesForComponent('Divider')).toEqual(['border.subtle'])
  })

  it('SegmentedControl can name the floating surface its track paints', () => {
    expect(rolesForComponent('SegmentedControl')).toContain('surface.layer-2')
  })

  it('a text field can name its focus ring', () => {
    for (const key of ['Input', 'Select', 'Textarea']) {
      expect(rolesForComponent(key), key).toContain('border.focus')
    }
  })

  it('Toggle can name the solved hover tone of its track', () => {
    expect(rolesForComponent('Toggle')).toContain('action.primary.hover')
  })

  it('Toast can name the inverse pair it is built from', () => {
    expect(rolesForComponent('Toast')).toEqual(expect.arrayContaining(['surface.inverse', 'content.inverse']))
  })
})
