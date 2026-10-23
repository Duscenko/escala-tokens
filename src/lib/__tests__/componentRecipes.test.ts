import { describe, expect, it } from 'vitest'
import {
  COMPONENT_RECIPES, cssVarOf, recipeColorRoles, recipeTokenRefs, resolveRecipe, serializeRecipes,
} from '../componentRecipes'
import { RECIPE_CSS, recipeCss, recipeCssVars, slotName } from '../recipeStyles'
import { COMPONENTS } from '../componentCatalogue'
import { buildArchitectureView } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { wcagRatio } from '../color/apca'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'

/**
 * E15 of design-plans/shadcn-component-skeleton.md: ONE recipe per component,
 * read by the web (generated sheet) and the Figma plugin (`tokens.json`
 * `componentRecipes`). These tests are the parity contract.
 */

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const view = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
  pageBackground: system.lightBg, darkBackground: system.darkBg,
} as never, system.errorSeed)!
const roleHex: Record<string, Record<string, string>> = {}
for (const cat of view.categories) {
  for (const tk of cat.tokens) {
    roleHex[`${cat.key}.${tk.key}`] = Object.fromEntries(Object.entries(tk.modes).map(([m, v]) => [m, v.css]))
  }
}

function combos(axes: { name: string; values: string[] }[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (acc, a) => acc.flatMap((prev) => a.values.map((v) => ({ ...prev, [a.name]: v }))),
    [{}],
  )
}

describe('component recipes', () => {
  it('cover a catalogue component, with the catalogue axes, and every combination of them', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const def = COMPONENTS.find((c) => c.key === recipe.key)
      expect(def, recipe.key).toBeDefined()
      const axes = new Map(def!.axes.map((a) => [a.name, a.values]))
      for (const part of recipe.parts) {
        for (const axis of part.axes) {
          expect(axes.get(axis), `${recipe.key}.${axis}`).toBeDefined()
        }
        const want = combos(part.axes.map((name) => ({ name, values: axes.get(name)! })))
          .map((c) => part.axes.map((a) => c[a]).join('|'))
        expect(Object.keys(part.values).sort(), recipe.key).toEqual(want.sort())
      }
      for (const [axis, value] of Object.entries(recipe.defaults)) {
        expect(axes.get(axis), `${recipe.key} default ${axis}`).toContain(value)
      }
    }
  })

  it('only paint slots the recipe declares (a key may carry a :state / [attr] suffix)', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const declared = new Set([...recipe.slots, ...Object.keys(recipe.pseudoSlots ?? {})])
      for (const p of recipe.parts) {
        for (const slots of Object.values(p.values)) {
          for (const key of Object.keys(slots)) expect(declared, `${recipe.key}.${key}`).toContain(slotName(key))
        }
      }
    }
  })

  it('hold token references only — no number, no hex, no opacity', () => {
    const REF = /^(color\.[a-z0-9.-]+|(size|selector|icon|radius|spacing|stroke|type|shadow)\.[a-z0-9_-]+)$/
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      for (const ref of recipeTokenRefs(recipe)) expect(ref, recipe.key).toMatch(REF)
    }
  })

  it('paint only with real Categorical roles, resolved in both appearances', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      for (const role of recipeColorRoles(recipe)) {
        expect(roleHex[role], `${recipe.key} → ${role}`).toBeDefined()
        expect(roleHex[role].light, role).toMatch(/^#[0-9a-f]{6,8}$/i)
        expect(roleHex[role].dark, role).toMatch(/^#[0-9a-f]{6,8}$/i)
      }
    }
  })

  it('give every filled button variant distinct hover states (no opacity dim)', () => {
    const fill = (v: Record<string, string>) => resolveRecipe(COMPONENT_RECIPES.Button, v).root.fill!.slice(6)
    for (const color of ['default', 'secondary', 'destructive']) {
      for (const mode of ['light', 'dark']) {
        const hex = ['Default', 'Hover', 'Pressed'].map((State) => roleHex[fill({ Variant: color, State })][mode])
        expect(new Set(hex).size, `${color} ${mode}: ${hex.join(' ')}`).toBeGreaterThanOrEqual(2)
        expect(hex[1], `${color} ${mode} hover`).not.toBe(hex[0])
      }
    }
  })

  it('ship in tokens.json as the same table the web reads', () => {
    const shipped = generateTokenJSON(useDesignStore.getState()).componentRecipes
    expect(shipped).toEqual(serializeRecipes())
    // The plugin resolves the serialized copy; it must answer exactly what the
    // web resolves, for every combination.
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const def = COMPONENTS.find((c) => c.key === recipe.key)!
      for (const v of combos(def.axes)) {
        expect(resolveRecipe(shipped[recipe.key], v), `${recipe.key} ${JSON.stringify(v)}`)
          .toEqual(resolveRecipe(recipe, v))
      }
    }
  })
})

describe('the generated stylesheet', () => {
  it('declares exactly the variables the recipe references', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const expected = new Set<string>()
      for (const ref of recipeTokenRefs(recipe)) {
        if (ref.startsWith('type.')) {
          for (const f of ['font-family', 'font-size', 'line-height', 'font-weight', 'letter-spacing']) expected.add(cssVarOf(ref, f))
        } else expected.add(cssVarOf(ref))
      }
      const used = recipeCssVars(recipeCss(recipe)).filter((v) => v !== '--stroke-focus' && v !== '--stroke-focus-offset')
      expect(new Set(used), recipe.key).toEqual(expected)
    }
  })

  it('paints each state with its own role (shadcn variants)', () => {
    const css = recipeCss(COMPONENT_RECIPES.Button)
    const rule = (sel: string) => css.split('}').find((r) => r.includes(sel) && r.includes('background'))
    expect(rule('[data-variant="default"] {')).toContain('var(--color-action-primary-default)')
    expect(rule('[data-variant="default"]:hover')).toContain('var(--color-action-primary-hover)')
    expect(rule('[data-variant="default"][data-force-state="Pressed"]')).toContain('var(--color-action-primary-pressed)')
    // Destructive is the critical SOLID with its own ink (a Delete reads as an action).
    expect(rule('[data-variant="destructive"] {')).toContain('var(--color-status-critical-surface-solid)')
    expect(rule('[data-variant="destructive"] {')).toContain('var(--color-status-critical-on-solid)')
    expect(rule('[data-variant="destructive"]:hover')).toContain('var(--color-status-critical-surface-solid-hover)')
  })

  it('reads only names variables.css ships', async () => {
    // A real system (ramps generated), so every role resolves to a colour.
    const { ensureColorScales } = await import('../colorActions')
    ensureColorScales()
    const css = buildCSS(useDesignStore.getState())
    const shipped = new Set(css.match(/--[a-z0-9_-]+(?=:)/g))
    const missing = recipeCssVars(RECIPE_CSS).filter((v) => !shipped.has(v))
    expect(missing).toEqual([])
  })
})

// The Figma audit found 54 Focused variants painted exactly like Default: the
// Button / Checkbox / Switch focus was the translucent `border.ring.default`
// halo alone. Focus must CHANGE the paint, and on a non-field it is the solid,
// contrast-solved `border.focus` ring.
describe('focus', () => {
  it('every Focused state paints something Default does not', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const def = COMPONENTS.find((c) => c.key === recipe.key)!
      const state = def.axes.find((a) => a.name === 'State')
      if (!state?.values.includes('Focused')) continue
      for (const v of combos(def.axes.filter((a) => a.name !== 'State'))) {
        const rest = resolveRecipe(recipe, { ...v, State: 'Default' })
        const focused = resolveRecipe(recipe, { ...v, State: 'Focused' })
        expect(focused, `${recipe.key} ${JSON.stringify(v)}`).not.toEqual(rest)
      }
    }
  })

  it('Button, Checkbox and Switch focus with the solid border.focus ring', () => {
    for (const key of ['Button', 'Checkbox', 'Switch']) {
      const def = COMPONENTS.find((c) => c.key === key)!
      for (const v of combos(def.axes.filter((a) => a.name !== 'State'))) {
        expect(resolveRecipe(COMPONENT_RECIPES[key], { ...v, State: 'Focused' }).root.focus, `${key} ${JSON.stringify(v)}`)
          .toBe('color.border.focus')
      }
    }
  })

  it('the ring clears WCAG 1.4.11 against the page it is set off onto, in both themes', () => {
    for (const mode of ['light', 'dark']) {
      expect(wcagRatio(roleHex['border.focus'][mode], roleHex['surface.page'][mode]), mode).toBeGreaterThanOrEqual(3)
    }
  })

  it('renders as an offset outline, not a box-shadow', () => {
    const css = recipeCss(COMPONENT_RECIPES.Button)
    expect(css).toContain('outline: var(--stroke-focus, 2px) solid var(--color-border-focus)')
    expect(css).toContain('outline-offset: var(--stroke-focus-offset, 2px)')
  })
})
