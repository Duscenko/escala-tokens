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
    for (const color of ['default', 'secondary', 'critical']) {
      for (const mode of ['light', 'dark']) {
        const hex = ['Default', 'Hover', 'Pressed'].map((State) => roleHex[fill({ Variant: color, Appearance: 'solid', State })][mode])
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
      // The focus halo reads `stroke.focus` + `stroke.control` (and a solid's top
      // highlight its 2px offset from `stroke.focus`) without the recipe naming them.
      const implied = ['--stroke-focus', '--stroke-control']
      const used = recipeCssVars(recipeCss(recipe)).filter((v) => !implied.includes(v))
      for (const v of implied) expected.delete(v)
      expect(new Set(used), recipe.key).toEqual(expected)
    }
  })

  it('paints each state with its own role (Figma Variant × Appearance)', () => {
    const css = recipeCss(COMPONENT_RECIPES.Button)
    const rule = (sel: string) => css.split('}').find((r) => r.includes(sel) && r.includes('background'))
    const solid = (v: string) => `[data-variant="${v}"][data-appearance="solid"]`
    expect(rule(`${solid('default')} {`)).toContain('var(--color-action-primary-default)')
    expect(rule(`${solid('default')}:hover`)).toContain('var(--color-action-primary-hover)')
    expect(rule(`${solid('default')}[data-force-state="Pressed"]`)).toContain('var(--color-action-primary-pressed)')
    // critical · solid is the critical SOLID with its own ink (a Delete reads as an action).
    expect(rule(`${solid('critical')} {`)).toContain('var(--color-status-critical-surface-solid)')
    expect(rule(`${solid('critical')} {`)).toContain('var(--color-status-critical-on-solid)')
    expect(rule(`${solid('critical')}:hover`)).toContain('var(--color-status-critical-surface-solid-hover)')
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

  it('Checkbox and Switch focus with the border.focus edge and the halo', () => {
    for (const key of ['Checkbox', 'Switch']) {
      const def = COMPONENTS.find((c) => c.key === key)!
      for (const v of combos(def.axes.filter((a) => a.name !== 'State'))) {
        // Checkbox's other Variants carry their own focus pair (the Figma file, checkbox-contract.md).
        if (key === 'Checkbox' && v.Variant !== 'default') continue
        const root = resolveRecipe(COMPONENT_RECIPES[key], { ...v, State: 'Focused' }).root
        if (root.fill === 'color.action.disabled.default') continue
        expect(root.focus, `${key} ${JSON.stringify(v)}`).toBe('color.border.focus')
        expect(root.ring, `${key} ${JSON.stringify(v)}`).toBe('color.border.ring.default')
      }
    }
  })

  // The focus edge is the one each Figma variant strokes in its Focused state
  // (design-plans/button-contract.md); every variant adds the border.ring.default
  // halo. The edge is not one colour yet: the file strokes secondary · solid with
  // border.strong and Button critical solid / outline with the critical border.
  it.each([
    ['default', 'solid', 'color.border.focus'],
    ['default', 'outline', 'color.border.focus'],
    ['default', 'ghost', 'color.border.focus'],
    ['default', 'link', 'color.border.focus'],
    ['secondary', 'solid', 'color.border.focus'],
    ['secondary', 'outline', 'color.border.focus'],
    ['secondary', 'ghost', 'color.border.focus'],
    ['secondary', 'link', 'color.border.focus'],
    ['critical', 'solid', 'color.border.focus'],
    ['critical', 'outline', 'color.border.focus'],
    ['critical', 'ghost', 'color.border.focus'],
    ['critical', 'link', 'color.border.focus'],
  ])('Button %s · %s focuses with edge %s and the ring halo', (variant, appearance, edge) => {
    const root = resolveRecipe(COMPONENT_RECIPES.Button, { Variant: variant, Appearance: appearance, Size: 'default', State: 'Focused' }).root
    expect(root.focus).toBe(edge)
    expect(root.ring).toBe('color.border.ring.default')
  })

  // IconButton keeps its own edge + ring on two solid fills (Figma file, 2026-11-12).
  it.each([
    ['secondary', 'color.border.strong', 'color.border.subtle'],
    ['critical', 'color.status.critical.border-strong', 'color.status.critical.border'],
  ])('IconButton %s · solid focuses with edge %s and ring %s, as the Figma file does', (variant, edge, ring) => {
    const root = resolveRecipe(COMPONENT_RECIPES.IconButton, { Variant: variant, Appearance: 'solid', Size: 'default', State: 'Focused' }).root
    expect(root.focus).toBe(edge)
    expect(root.ring).toBe(ring)
  })

  // Figma's render of the solid Button (4:2186), read pixel by pixel: the top
  // highlight fills the node's top 2 rows, and the DROP_SHADOW spread 1 paints
  // nothing (Figma ignores spread on a frame that does not clip content).
  it.each(['Default', 'Hover', 'Pressed', 'Focused', 'Loading'])('a solid %s carries the top highlight', (state) => {
    const root = resolveRecipe(COMPONENT_RECIPES.Button, { Variant: 'default', Appearance: 'solid', Size: 'default', State: state }).root
    expect(root.highlight).toBe('color.elevation.highlight')
  })
  it('a disabled solid carries no highlight', () => {
    const root = resolveRecipe(COMPONENT_RECIPES.Button, { Variant: 'default', Appearance: 'solid', Size: 'default', State: 'Disabled' }).root
    expect(root.highlight).toBe('none')
  })
  // Only outline has a stroke in the file: a transparent border on a solid
  // would push its highlight 1px below the top edge.
  it.each([['solid', 'stroke.none'], ['outline', 'stroke.control'], ['ghost', 'stroke.none'], ['link', 'stroke.none']])(
    'a %s button strokes %s, as the Figma file', (appearance, stroke) => {
      for (const key of ['Button', 'IconButton']) {
        const root = resolveRecipe(COMPONENT_RECIPES[key], { Variant: 'default', Appearance: appearance, Size: 'default', State: 'Default' }).root
        expect(root.strokeWidth, key).toBe(stroke)
      }
    })

  it('IconButton critical · outline focuses on border.focus (Figma)', () => {
    const root = resolveRecipe(COMPONENT_RECIPES.IconButton, { Variant: 'critical', Appearance: 'outline', Size: 'default', State: 'Focused' }).root
    expect(root.focus).toBe('color.border.focus')
  })

  it('the ring clears WCAG 1.4.11 against the page it is set off onto, in both themes', () => {
    for (const mode of ['light', 'dark']) {
      expect(wcagRatio(roleHex['border.focus'][mode], roleHex['surface.page'][mode]), mode).toBeGreaterThanOrEqual(3)
    }
  })

  // The Figma file (Checkbox 1014:14, Button 4:2228): a 2px border.focus edge
  // INSIDE the control (its border + an inset making up the rest) and a 2px
  // border.ring halo fully outside it.
  it('renders as the Figma file does: a 2px edge inside, a 2px halo outside', () => {
    const css = recipeCss(COMPONENT_RECIPES.Checkbox)
    expect(css).toContain('box-shadow: inset 0 0 0 max(0px, calc(var(--stroke-focus, 2px) - var(--escala-stroke-width, 0px))) var(--color-border-focus), 0 0 0 var(--stroke-focus, 2px) var(--color-border-ring-default)')
    expect(css).toContain('border-color: var(--color-border-focus)')
    expect(css).toContain('outline: var(--stroke-focus, 2px) solid transparent')
  })
  // The Figma file's Input (4:10640): the 1px edge stays, and a 2px ring
  // straddles it — 1px over the edge, 1px outside.
  it("draws a field's halo over its own edge, as the Figma Input does", () => {
    const css = recipeCss(COMPONENT_RECIPES.Input)
    expect(css).toContain('outline: var(--stroke-focus, 2px) solid var(--color-border-ring-default)')
    expect(css).toContain('outline-offset: calc(var(--escala-stroke-width, 0px) - var(--stroke-focus, 2px))')
  })
})

// The Figma `Input` set (design-plans/input-contract.md, 4:12380): the bare box, Size ×
// State. `State`'s Figma option is `Invalid`, not `Error`. Disabled keeps the NEUTRAL
// `border.control` stroke — only the fill mutes (a real bug in the shared `fieldBox`,
// fixed here: it used to repaint the stroke in the disabled fill colour too).
describe('Input (Figma)', () => {
  const at = (over: Record<string, string>) => resolveRecipe(COMPONENT_RECIPES.Input, { Size: 'default', State: 'Default', ...over })

  it('sizes on the Size roles: compact 32 · control 40 · touch 48', () => {
    expect(at({ Size: 'sm' }).root.height).toBe('size.compact')
    expect(at({ Size: 'default' }).root.height).toBe('size.control')
    expect(at({ Size: 'lg' }).root.height).toBe('size.touch')
  })

  it('Default · Hover · Focused · Invalid colours, measured against the file', () => {
    expect(at({ State: 'Default' }).root).toMatchObject({ fill: 'color.surface.input', stroke: 'color.border.control' })
    expect(at({ State: 'Hover' }).root.stroke).toBe('color.border.control-hover')
    expect(at({ State: 'Focused' }).root).toMatchObject({ stroke: 'color.border.focus', ring: 'color.border.ring.default' })
    expect(at({ State: 'Invalid' }).root).toMatchObject({ stroke: 'color.status.critical.border-strong', ring: 'color.status.critical.border' })
  })

  it('Disabled keeps the Default stroke colour — only the fill and the inks mute', () => {
    const r = at({ State: 'Disabled' })
    expect(r.root).toMatchObject({ fill: 'color.action.disabled.default', stroke: 'color.border.control' })
    for (const slot of ['text', 'placeholder', 'icon', 'addon']) expect(r[slot].text, slot).toBe('color.content.disabled')
  })

  it('the placeholder reads content.subtle; a typed value, icons and add-ons content.primary', () => {
    const r = at({})
    expect(r.placeholder.text).toBe('color.content.subtle')
    for (const slot of ['text', 'icon', 'addon']) expect(r[slot].text, slot).toBe('color.content.primary')
  })

  it('the Types that lay their strokes out start 1px further in (13, not 12)', () => {
    for (const type of ['currency-select', 'url', 'upload', 'copy-link']) {
      expect(at({ Type: type }).root.paddingX, type).toBe('spacing.inset-control+stroke.control')
    }
    for (const type of ['default', 'phone', 'currency', 'password', 'tag', 'credit-card', 'search']) {
      expect(at({ Type: type }).root.paddingX, type).toBe('spacing.inset-control')
    }
  })

  it('glyphs and keys follow the box (icon-sm in sm, icon-md else); the select caret stays 16', () => {
    expect(at({ Size: 'sm' }).icon).toMatchObject({ width: 'icon.small', height: 'icon.small' })
    expect(at({ Size: 'lg' }).icon.width).toBe('icon.medium')
    expect(at({ Size: 'lg' })['icon[data-icon="chevron"]'].width).toBe('icon.small')
    expect(at({ Size: 'sm' }).kbd.height).toBe('icon.small')
    expect(at({}).kbd).toMatchObject({ fill: 'color.surface.muted', stroke: 'color.border.subtle', text: 'color.content.secondary', radius: 'radius.control' })
    expect(at({}).divider).toMatchObject({ fill: 'color.border.subtle', width: 'stroke.control' })
  })
})

// WCAG 2.5.8: a selector glyph (18px) and a Chip's × (~10px) sit under the 24px
// minimum target. The glyph keeps its size; a transparent `::before` of at
// least `size.hit` is the pointer target (Figma audit, Phase 4).
describe('target size', () => {
  const hitSlots: [string, string][] = [['Checkbox', 'root'], ['Switch', 'root'], ['RadioGroup', 'item'], ['SliderThumb', 'root'], ['Chip', 'remove']]
  it.each(hitSlots)('%s %s carries a size.hit target', (key, slot) => {
    expect(resolveRecipe(COMPONENT_RECIPES[key])[slot]?.hit).toBe('size.hit')
  })
  it('renders the target as a centred ::before at least size.hit square', () => {
    const css = recipeCss(COMPONENT_RECIPES.Checkbox)
    expect(css).toContain('[data-escala="Checkbox"]::before')
    expect(css).toContain('width: max(100%, var(--size-control-xs))')
    expect(css).toContain('position: relative')
  })
})

// The Figma `CloseButton` set (design-plans/close-button-contract.md). Values are read
// from the file, variant by variant; these hold the odd parts: Hover / Pressed are the
// same translucent fill STACKED over the rest fill, soft and solid focus with a halo and
// no edge, outline and ghost with a 2px edge inside plus the halo, and nothing paints a
// highlight.
describe('CloseButton (Figma)', () => {
  const root = (over: Record<string, string>) =>
    resolveRecipe(COMPONENT_RECIPES.CloseButton, { Appearance: 'soft', Shape: 'pill', Size: 'default', State: 'Default', Variant: 'default', ...over }).root

  it('stacks the muted fill once on hover and twice on pressed (solid · default)', () => {
    expect(root({ Appearance: 'solid', State: 'Default' })).toMatchObject({ fill: 'color.surface.inverse' })
    expect(root({ Appearance: 'solid', State: 'Hover' })).toMatchObject({ fill: 'color.surface.inverse', overlay: 'color.surface.inverse-muted' })
    expect(root({ Appearance: 'solid', State: 'Pressed' })).toMatchObject({ overlay: 'color.surface.inverse-muted', overlay2: 'color.surface.inverse-muted' })
  })
  it('stacks three layers on soft · inverse · pressed', () => {
    const r = root({ Variant: 'inverse', State: 'Pressed' })
    expect(r).toMatchObject({ fill: 'color.surface.inverse-muted', overlay: 'color.surface.inverse-muted', overlay2: 'color.surface.inverse-muted' })
  })
  it.each([['solid', 'default', 'color.border.subtle'], ['soft', 'default', 'color.border.subtle'], ['solid', 'inverse', 'color.surface.inverse-muted'], ['soft', 'inverse', 'color.surface.inverse-muted']])(
    '%s · %s focuses with a halo alone, no edge',
    (appearance, variant, halo) => {
      const r = root({ Appearance: appearance, Variant: variant, State: 'Focused' })
      expect(r.halo).toBe(halo)
      expect(r.focus).toBeUndefined()
      expect(r.ring).toBeUndefined()
    },
  )
  it.each([['outline', 'default', 'color.border.strong'], ['ghost', 'default', 'color.border.strong'], ['outline', 'inverse', 'color.border.inverse'], ['ghost', 'inverse', 'color.border.inverse']])(
    '%s · %s focuses with a 2px edge inside plus the halo',
    (appearance, variant, edge) => {
      const r = root({ Appearance: appearance, Variant: variant, State: 'Focused' })
      expect(r.focus).toBe(edge)
      expect(r.ring).toBeDefined()
      expect(r.halo).toBeUndefined()
    },
  )
  it('only outline has a stroke, and nothing carries the solid highlight', () => {
    for (const appearance of ['solid', 'outline', 'soft', 'ghost']) {
      const r = root({ Appearance: appearance })
      expect(r.strokeWidth).toBe(appearance === 'outline' ? 'stroke.control' : 'stroke.none')
      expect(r.highlight).toBeUndefined()
    }
  })
  it('sizes and shapes follow the Figma roles', () => {
    expect(root({ Size: 'xl' })).toMatchObject({ height: 'size.fab', width: 'size.fab' })
    expect(resolveRecipe(COMPONENT_RECIPES.CloseButton, { Size: 'xl' }).icon).toMatchObject({ width: 'icon.large' })
    expect(root({ Shape: 'square' }).radius).toBe('radius.none')
    expect(root({ Shape: 'rounded' }).radius).toBe('radius.action')
    expect(root({ Shape: 'pill' }).radius).toBe('radius.pill')
  })
  it('paints the stack as gradient layers over the base fill, and the halo outside', () => {
    const css = recipeCss(COMPONENT_RECIPES.CloseButton)
    expect(css).toContain('background: linear-gradient(var(--color-surface-inverse-muted), var(--color-surface-inverse-muted)), linear-gradient(var(--color-surface-inverse-muted), var(--color-surface-inverse-muted)), var(--color-surface-inverse)')
    expect(css).toContain('box-shadow: 0 0 0 var(--stroke-focus, 2px) var(--color-border-subtle)')
  })
})

// The Figma `TextLink` set (design-plans/text-link-contract.md). Held here: one ink for
// text, underline and icons; the underline at 40% until Hover / Pressed; a Focused link
// that grows by the 2px inside stroke; the lg label bound to the scale step, not a role.
describe('TextLink (Figma)', () => {
  const at = (over: Record<string, string>) =>
    resolveRecipe(COMPONENT_RECIPES.TextLink, { Size: 'default', State: 'Default', Variant: 'default', ...over })

  it.each([
    ['default', 'Default', 'color.content.link.default'], ['default', 'Hover', 'color.content.link.hover'], ['default', 'Visited', 'color.content.link.default'],
    ['secondary', 'Default', 'color.content.secondary'], ['secondary', 'Pressed', 'color.content.primary'],
    ['inverse', 'Hover', 'color.content.inverse'], ['critical', 'Default', 'color.status.critical.content'],
    ['success', 'Focused', 'color.status.success.content'], ['info', 'Disabled', 'color.content.disabled'],
  ])('%s · %s reads %s', (variant, state, ink) => {
    expect(at({ Variant: variant, State: state }).root.text).toBe(ink)
  })
  it('draws the underline at 40% at rest and at full strength on Hover and Pressed', () => {
    expect(at({ State: 'Default' }).underline.opacity).toBe('0.4')
    expect(at({ State: 'Focused' }).underline.opacity).toBe('0.4')
    expect(at({ State: 'Hover' }).underline).toMatchObject({ opacity: '1', fill: 'color.content.link.hover' })
    expect(at({ State: 'Pressed' }).underline.opacity).toBe('1')
  })
  it('hides the underline from a data attribute, leaving Hover and Pressed their own rule', () => {
    expect(at({})['underline[data-visible="false"]']).toEqual({ fill: 'none' })
    const css = recipeCss(COMPONENT_RECIPES.TextLink)
    expect(css).toContain('[data-part="TextLink.underline"][data-visible="false"]')
    expect(css).toContain('opacity: 0.4')
  })
  it.each([['default', 'color.border.focus', 'color.border.ring.default'], ['secondary', 'color.border.strong', 'color.border.subtle'],
    ['inverse', 'color.border.inverse', 'color.surface.inverse-muted'], ['critical', 'color.status.critical.border-strong', 'color.status.critical.border']])(
    '%s focuses with edge %s and halo %s, and grows by the stroke', (variant, edge, ring) => {
      const root = at({ Variant: variant, State: 'Focused' }).root
      expect(root).toMatchObject({ focus: edge, ring, paddingX: 'spacing.gap-tight+stroke.focus', paddingY: 'stroke.focus' })
    },
  )
  it('sizes the label, icon and gap by Size, and lg reads the scale step', () => {
    expect(at({ Size: 'xs' }).label.font).toBe('type.body-sm')
    expect(at({ Size: 'default' }).label.font).toBe('type.body-lg')
    expect(at({ Size: 'lg' }).label.font).toBe('type.text-xl')
    expect(at({ Size: 'sm' }).icon.width).toBe('icon.small')
    expect(at({ Size: 'lg' }).icon.width).toBe('icon.medium')
    expect(at({ Size: 'sm' }).root.gap).toBe('spacing.gap-tight')
    expect(at({ Size: 'lg' }).root.gap).toBe('spacing.gap-control')
    expect(cssVarOf('type.text-xl', 'font-size')).toBe('--font-size-text-xl')
    expect(cssVarOf('type.body-sm', 'font-size')).toBe('--text-body-sm-font-size')
  })
  it('keeps opacity out of the token references', () => {
    const refs = recipeTokenRefs(COMPONENT_RECIPES.TextLink)
    expect(refs).not.toContain('0.4')
    expect(refs).not.toContain('1')
  })
})

// The Figma `FABButton` set (design-plans/fab-button-contract.md). Held here: the lift
// (named elevation) per state composed with the highlight, the halo-only focus that
// keeps the lift, the stacked fills, the two-layer disabled fill, and the label's own
// trailing inset; the stylesheet leaves the file's unrendered spreads out.
describe('FABButton (Figma)', () => {
  const at = (over: Record<string, string>) =>
    resolveRecipe(COMPONENT_RECIPES.FABButton, { Appearance: 'solid', Shape: 'rounded', Size: 'default', State: 'Default', Variant: 'default', ...over })

  it('lifts by state: rest, hover higher, pressed tight', () => {
    expect(at({ State: 'Default' }).root.lift).toBe('rest')
    expect(at({ State: 'Hover' }).root.lift).toBe('hover')
    expect(at({ State: 'Pressed' }).root.lift).toBe('pressed')
    expect(at({ State: 'Focused' }).root.lift).toBe('rest')
    expect(at({ State: 'Default' }).root.highlight).toBe('color.elevation.highlight')
  })
  it('Disabled is the page under the disabled fill, with no lift and no highlight', () => {
    expect(at({ State: 'Disabled' }).root).toMatchObject({ fill: 'color.surface.page', overlay: 'color.action.disabled.default', text: 'color.content.disabled', lift: 'none', highlight: 'none' })
  })
  it.each([['default', 'color.border.ring.default'], ['secondary', 'color.border.subtle'], ['inverse', 'color.surface.inverse-muted']])(
    '%s focuses with a halo alone (%s), and keeps its lift', (variant, halo) => {
      const r = at({ Variant: variant, State: 'Focused' }).root
      expect(r.halo).toBe(halo)
      expect(r.focus).toBeUndefined()
      expect(r.lift).toBe('rest')
    },
  )
  it('stacks a translucent fill on Hover and Pressed for soft and inverse', () => {
    expect(at({ Appearance: 'soft', State: 'Hover' }).root).toMatchObject({ fill: 'color.surface.accent', overlay: 'color.surface.selected' })
    expect(at({ Appearance: 'soft', State: 'Pressed' }).root.overlay).toBe('color.surface.selected-pressed')
    expect(at({ Variant: 'secondary', Appearance: 'soft', State: 'Hover' }).root).toMatchObject({ fill: 'color.surface.layer-2', overlay: 'color.action.ghost.hover' })
    expect(at({ Variant: 'inverse', State: 'Pressed' }).root).toMatchObject({ overlay: 'color.surface.inverse-muted', overlay2: 'color.surface.inverse-muted' })
    expect(at({ Variant: 'default', State: 'Hover' }).root.fill).toBe('color.action.primary.hover')
  })
  it('paints inverse · soft as the solid chip (the file draws it solid only)', () => {
    expect(at({ Variant: 'inverse', Appearance: 'soft' }).root.fill).toBe('color.surface.inverse')
  })
  it('sizes: touch / fab, icon medium / large, min width = height, label trailing inset', () => {
    expect(at({ Size: 'default' }).root).toMatchObject({ height: 'size.touch', minWidth: 'size.touch' })
    expect(at({ Size: 'lg' }).root).toMatchObject({ height: 'size.fab', minWidth: 'size.fab' })
    expect(at({ Size: 'lg' }).icon).toMatchObject({ width: 'icon.large' })
    expect(at({}).label.paddingRight).toBe('spacing.gap-control')
    expect(at({ Shape: 'pill' }).root.radius).toBe('radius.pill')
    expect(at({ Shape: 'rounded' }).root.radius).toBe('radius.action')
  })
  it('writes the lift as offset and blur only, composed with the highlight and the halo', () => {
    const css = recipeCss(COMPONENT_RECIPES.FABButton)
    expect(css).toContain('box-shadow: 0 12px 16px var(--color-elevation-shadow-key), 0 4px 6px var(--color-elevation-shadow-ambient), inset 0 var(--stroke-focus, 2px) 0 0 var(--color-elevation-highlight)')
    expect(css).toContain('0 0 0 var(--stroke-focus, 2px) var(--color-border-ring-default), 0 12px 16px var(--color-elevation-shadow-key)')
    expect(css).not.toMatch(/16px -4px/)
  })
  it('counts the Elevation colours as references and keeps lift / opacity out of the tokens', () => {
    const refs = recipeTokenRefs(COMPONENT_RECIPES.FABButton)
    expect(refs).toContain('color.elevation.shadow-key')
    expect(refs).toContain('color.elevation.shadow-ambient')
    expect(refs).not.toContain('rest')
  })
})

// The Figma `FABGroup` set (design-plans/fab-group-contract.md). The trigger and every
// item paint themselves (the FABButton recipe above) — FABGroup only owns `stack`'s
// vertical gap (measured 12px = `Spacing/inset-control`). The fan layouts' 100px radius
// matches no Dimension role, so they carry no `root` paint at all.
describe('FABGroup (Figma)', () => {
  const at = (layout: string) => resolveRecipe(COMPONENT_RECIPES.FABGroup, { Layout: layout, Open: 'true' })

  it('stack gets the measured inset-control gap; every fan layout paints nothing', () => {
    expect(at('stack').root.gap).toBe('spacing.inset-control')
    expect(at('fan-center').root.gap).toBeUndefined()
    expect(at('fan-left').root.gap).toBeUndefined()
    expect(at('fan-right').root.gap).toBeUndefined()
  })
})
