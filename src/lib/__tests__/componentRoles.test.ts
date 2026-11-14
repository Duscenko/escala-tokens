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

  it('TabMenuItem binds the selected-tab surface', () => {
    expect(rolesForComponent('TabMenuItem')).toContain('surface.selected')
  })

  it('Button (link variant) binds the link roles, not accent copy', () => {
    const roles = rolesForComponent('Button')
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

  it('Separator resolves its three Tones and the label ink', () => {
    // The Figma Tone axis (2026-11-13): default · subtle · strong lines, and the label on Content/secondary.
    expect(rolesForComponent('Separator').sort()).toEqual(['border.default', 'border.strong', 'border.subtle', 'content.secondary'])
  })

  it('SegmentedControl can name the surface its track paints', () => {
    // The Figma file paints the track Surface/muted (2026-11-12), no longer layer-2.
    expect(rolesForComponent('SegmentedControl')).toContain('surface.muted')
  })

  it('a text field can name its focus ring', () => {
    for (const key of ['Input', 'Combobox', 'Textarea']) {
      expect(rolesForComponent(key), key).toContain('border.focus')
    }
  })

  it('Switch can name the solved hover tone of its track', () => {
    expect(rolesForComponent('Switch')).toContain('action.primary.hover')
  })

  it('Toast names the surface, ink and edge the Figma set paints', () => {
    expect(rolesForComponent('Toast')).toEqual(expect.arrayContaining(['surface.layer-2', 'content.primary', 'border.default']))
  })
})
