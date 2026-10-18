import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COMPONENT_RECIPES, recipeColorRoles, resolveRecipe, serializeRecipes } from '../componentRecipes'
import { COMPONENTS } from '../componentCatalogue'
import { figmaSemanticName } from '../agentBundle/names'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'

/**
 * Cross-repo parity (E15): the plugin's PURE recipe module
 * (`escala-figma-plugin/src/recipes.ts`) must plan, for every combination of
 * axes, exactly the roles the web recipe paints with — and name the Figma
 * variable the configurator publishes for each. No Figma needed: both sides are
 * pure. Skipped where the sibling repo is not checked out (Vercel builds this
 * repo alone).
 */
const pluginFile = join(dirname(fileURLToPath(import.meta.url)), '../../../../escala-figma-plugin/src/recipes.ts')
const pluginCode = join(dirname(pluginFile), 'code.ts')

function combos(axes: { name: string; values: string[] }[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (acc, a) => acc.flatMap((prev) => a.values.map((v) => ({ ...prev, [a.name]: v }))),
    [{}],
  )
}
const role = (ref?: string) => (ref && ref.startsWith('color.') ? ref.slice(6) : null)

describe.skipIf(!existsSync(pluginFile))('plugin ↔ web recipe parity', () => {
  it('EVERY recipe: the plugin resolves the same slots as the web for every axis combination', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const def = COMPONENTS.find((c) => c.key === recipe.key)!
      for (const v of combos(def.axes)) {
        expect(plugin.recipeSlots(table, recipe.key, v), `${recipe.key} ${JSON.stringify(v)}`)
          .toEqual(resolveRecipe(recipe, v))
      }
    }
  })

  it('EVERY recipe: each colour role names the Figma variable the configurator publishes', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      for (const id of recipeColorRoles(recipe)) {
        expect(plugin.figmaRoleName(id), `${recipe.key} ${id}`).toBe(figmaSemanticName(id))
      }
    }
  })

  it('Button: every paint is the role the web paints; Figma names resolve', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    const def = COMPONENTS.find((c) => c.key === 'Button')!
    for (const v of combos(def.axes)) {
      const web = resolveRecipe(COMPONENT_RECIPES.Button, v).root ?? {}
      const plan = plugin.buttonPlan(table, v)
      expect(plan, JSON.stringify(v)).toEqual({
        fill: role(web.fill), stroke: role(web.stroke), text: role(web.text), ring: role(web.ring),
      })
      for (const id of Object.values(plan as Record<string, string | null>)) {
        if (id) expect(plugin.figmaRoleName(id), id).toBe(figmaSemanticName(id))
      }
    }
  })

  it('Button geometry: same refs, and the spacing resolves to the web value', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    for (const size of ['default', 'xs', 'sm', 'lg']) {
      const web = resolveRecipe(COMPONENT_RECIPES.Button, { Size: size }).root
      expect(plugin.buttonGeometry(table, size)).toEqual({
        height: web.height ?? null, paddingX: web.paddingX ?? null, gap: web.gap ?? null,
      })
    }
    // spacing.4 on the 4px base is 16px; a role follows its step.
    const spacing = { '4': '16px', '2': '8px', '1_5': '6px' }
    expect(plugin.spacingRefPx('spacing.4', spacing, undefined)).toBe(16)
    expect(plugin.spacingRefPx('spacing.gap-control', spacing, { 'gap-control': '2' })).toBe(8)
    expect(plugin.spacingRefPx('spacing.x', spacing, { x: 'dimension-20' })).toBe(20)
    expect(plugin.spacingRefPx('size.control', spacing, undefined)).toBeNull()
  })

  it('Input: label, box, value, placeholder, icon and hint match the web per state', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    const def = COMPONENTS.find((c) => c.key === 'Input')!
    for (const v of combos(def.axes.filter((a) => a.name !== 'Type'))) {
      const web = resolveRecipe(COMPONENT_RECIPES.Input, v)
      expect(plugin.inputPlan(table, v), JSON.stringify(v)).toEqual({
        label: role(web.label?.text), boxFill: role(web.field?.fill), boxStroke: role(web.field?.stroke),
        boxRing: role(web.field?.ring), value: role(web.value?.text),
        placeholder: role(web.placeholder?.text), icon: role(web.icon?.text), hint: role(web.hint?.text),
      })
    }
  })

  it('Card and Dialog: surface, edge, title and description match the web', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    for (const key of ['Card', 'Dialog'] as const) {
      const recipe = COMPONENT_RECIPES[key]
      const web = resolveRecipe(recipe, {})
      const root = web[recipe.slots[0]]
      expect(plugin.surfacePlan(table, key), key).toEqual({
        fill: role(root.fill), stroke: role(root.stroke),
        title: role(web.title?.text), description: role(web.description?.text),
      })
    }
  })

  // ── What the plugin BINDS, not only what it plans ─────────────────────────
  // code.ts applies `recipeBindings` to the layers named after each slot, after
  // every builder. These pin that list to the web recipe, that every length in
  // it resolves against a real tokens.json, and that every builder names a
  // layer for each of its slots — the three ways the two could drift.

  it('EVERY recipe: the bindings the plugin applies are the web recipe, slot for slot', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const table = serializeRecipes()
    const applied = new Set<string>([...plugin.PAINT_PROPS, ...plugin.GEOMETRY_PROPS])
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      const def = COMPONENTS.find((c) => c.key === recipe.key)!
      for (const v of combos(def.axes)) {
        const expected: { slot: string; prop: string; ref: string }[] = []
        const web = resolveRecipe(recipe, v)
        const slots = Object.keys(web).sort((a, b) => Number(a.includes('[')) - Number(b.includes('[')))
        for (const slot of slots) {
          if (slot.includes(':')) continue
          for (const [prop, ref] of Object.entries(web[slot])) {
            if (ref && applied.has(prop)) expected.push({ slot, prop, ref })
          }
        }
        expect(plugin.recipeBindings(table, recipe.key, v), `${recipe.key} ${JSON.stringify(v)}`).toEqual(expected)
      }
    }
  })

  it('EVERY recipe: each length the plugin applies resolves against the shipped tokens.json', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const tokens = generateTokenJSON(useDesignStore.getState()) as Record<string, unknown> & {
      icons?: { sizes?: { px?: Record<string, { desktop?: number }> } }
    }
    const pick = (k: string) => tokens[k] as Record<string, string> | undefined
    const src = {
      spacing: pick('spacing'), spacingRoles: pick('spacingRoles'),
      radius: pick('radius'), radiusRoles: pick('radiusRoles'),
      sizes: pick('sizes'), sizeRoles: pick('sizeRoles'),
      selector: pick('selector'), selectorRoles: pick('selectorRoles'),
      stroke: pick('stroke'), strokeRoles: pick('strokeRoles'),
      icon: { small: 16, medium: 20, large: 24 },
    }
    const geometry = new Set<string>(plugin.GEOMETRY_PROPS)
    const missing: string[] = []
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      for (const part of recipe.parts) {
        for (const slots of Object.values(part.values)) {
          for (const props of Object.values(slots)) {
            for (const [prop, ref] of Object.entries(props)) {
              if (!ref || !geometry.has(prop)) continue
              if (plugin.dimensionRefPx(ref, src) === null) missing.push(`${recipe.key} ${prop} ${ref}`)
            }
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })

  it('EVERY builder names a layer after each slot of its recipe (the Figma anatomy)', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const code = readFileSync(pluginCode, 'utf8')
    const table = serializeRecipes()
    expect(Object.keys(plugin.RECIPE_BUILDERS).sort()).toEqual(Object.keys(COMPONENT_RECIPES).sort())
    const gaps: Record<string, string[]> = {}
    for (const key of Object.keys(COMPONENT_RECIPES)) {
      const g = plugin.anatomyGaps(code, table, key)
      if (g.length) gaps[key] = g
    }
    expect(gaps).toEqual({})
    // Every documented difference names real slots of that recipe.
    for (const [key, a] of Object.entries(plugin.RECIPE_FIGMA_ANATOMY as Record<string, { root?: string; omit?: string[] }>)) {
      for (const slot of [...(a.omit ?? []), ...(a.root ? [a.root] : [])]) {
        expect(COMPONENT_RECIPES[key].slots, `${key}.${slot}`).toContain(slot)
      }
    }
  })

  it('a layer carries its slot by name: stems and data-state qualifiers', async () => {
    const plugin = await import(/* @vite-ignore */ pluginFile)
    const m = plugin.slotMatchesLayer
    expect(m('icon', 'icon-leading')).toBe(true)
    expect(m('item', 'itemSelected')).toBe(false)
    expect(m('cell', 'cell-active')).toBe(true)
    expect(m('cell[data-active="true"]', 'cell-active')).toBe(true)
    expect(m('cell[data-active="true"]', 'cell')).toBe(false)
    expect(m('node[data-state="done"]', 'node-done')).toBe(true)
    expect(m('item[data-highlighted]', 'item-highlighted')).toBe(true)
    expect(m('link[aria-current="page"]', 'link-page')).toBe(true)
    expect(m('root:hover', 'root')).toBe(false)
  })
})

