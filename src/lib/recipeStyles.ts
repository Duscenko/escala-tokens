/**
 * Recipe → stylesheet. The web half of E15 (design-plans/shadcn-component-skeleton.md).
 *
 * The sheet holds NO values: every declaration is a `var(--…)` named exactly as
 * `variables.css` names it (`cssVarOf`). Values arrive from the container — the
 * preview card sets them from `PreviewTokens` (`recipeVarStyle`), a product sets
 * them by importing `variables.css`. So one static sheet serves every theme,
 * appearance and platform on screen at once, and it can be generated at module
 * load.
 *
 * DOM contract (the shadcn-skeleton components in `components/escala-ui/` follow it):
 *  - the root carries `data-escala="<Key>"` and one `data-<axis>="<Value>"` per axis
 *    (`data-color="Brand"`, `data-style="Solid"`, `data-size="MD"`);
 *  - every other slot carries `data-part="<Key>.<slot>"` — namespaced, so a Button
 *    inside a Card is never painted by the Card's rules;
 *  - `data-force-state="<State>"` pins a state without a pointer (the docs
 *    playground). With it set, the real `:hover` / `:active` rules stand down.
 */
import {
  COMPONENT_RECIPES, cssVarOf, type ComponentRecipe, type RecipeProp, type SlotProps,
} from './componentRecipes'

/** Axes the CSS reads from an attribute (everything except the State axis). */
const STATE_AXIS = 'State'

const attr = (axis: string) => `data-${axis.toLowerCase()}`

/** Root-selector suffixes for one state. `Default` has none: it is the base. */
function stateSuffixes(key: string, state: string): string[] {
  const free = ':not([data-force-state]):not([aria-disabled="true"])'
  const forced = `[data-force-state="${state}"]`
  switch (state) {
    case 'Default': return ['']
    case 'Hover': return [`:hover${free}`, forced]
    case 'Pressed': return [`:active${free}`, forced]
    // The root itself (a button) or a wrapper around the focusable control.
    case 'Focused': return [`:focus-visible${free}`, `:has(:focus-visible)${free}`, forced]
    case 'Disabled': return ['[aria-disabled="true"]', forced]
    case 'Error': return ['[aria-invalid="true"]', forced]
    default: return [forced]
  }
}

/** `a+b` sums two dimensions: `calc(var(--a) + var(--b))`. */
function dim(ref: string): string {
  const parts = ref.split('+')
  const vars = parts.map((r) => `var(${cssVarOf(r)})`)
  return parts.length === 1 ? vars[0] : `calc(${vars.join(' + ')})`
}

function declarations(props: SlotProps): string[] {
  const out: string[] = []
  const v = (ref: string, facet?: string) => `var(${cssVarOf(ref, facet)})`
  const color = (ref: string) => (ref === 'none' ? 'transparent' : v(ref))
  for (const [prop, ref] of Object.entries(props) as [RecipeProp, string][]) {
    if (!ref) continue
    switch (prop) {
      case 'fill': out.push(`background: ${color(ref)}`); break
      case 'stroke': out.push(`border-color: ${color(ref)}`); break
      case 'text': out.push(`color: ${color(ref)}`); break
      // A second colour a part's artwork reads (a file icon's page fill).
      case 'paint': out.push(`--escala-paint: ${color(ref)}`); break
      // The spinning arc of a ring: only the top edge takes it.
      case 'strokeTop': out.push(`border-top-color: ${color(ref)}`); break
      case 'ring': out.push(ref === 'none' ? 'box-shadow: none' : `box-shadow: 0 0 0 var(--stroke-focus, 2px) ${v(ref)}`); break
      case 'height': out.push(`height: ${dim(ref)}`); break
      case 'minHeight': out.push(`min-height: ${dim(ref)}`); break
      case 'width': out.push(`width: ${dim(ref)}`); break
      // A custom property the part reads (a switch thumb's travel); not a CSS property.
      case 'travel': out.push(`--escala-travel: ${dim(ref)}`); break
      case 'radius': out.push(`border-radius: ${v(ref)}`); break
      case 'paddingX': out.push(`padding-inline: ${dim(ref)}`); break
      case 'paddingY': out.push(`padding-block: ${dim(ref)}`); break
      case 'gap': out.push(`gap: ${dim(ref)}`); break
      case 'strokeWidth': out.push(`border-width: ${v(ref)}`, 'border-style: solid'); break
      case 'shadow': out.push(`box-shadow: ${v(ref)}`); break
      case 'font':
        out.push(
          `font-family: ${v(ref, 'font-family')}`,
          `font-size: ${v(ref, 'font-size')}`,
          `line-height: ${v(ref, 'line-height')}`,
          `font-weight: ${v(ref, 'font-weight')}`,
          `letter-spacing: ${v(ref, 'letter-spacing')}`,
        )
        break
    }
  }
  return out
}

function slotSelector(recipe: ComponentRecipe, root: string, slot: string): string {
  if (slot === recipe.slots[0]) return root
  if (recipe.detachedSlots?.includes(slot)) return `[data-part="${recipe.key}.${slot}"]`
  const pseudo = recipe.pseudoSlots?.[slot]
  if (pseudo) return `${root} [data-part="${recipe.key}.${pseudo.of}"]${pseudo.pseudo}`
  return `${root} [data-part="${recipe.key}.${slot}"]`
}

/** A slot key may carry a selector suffix — `item:hover`, `thumb[data-state="checked"]`
 *  — so a PART can have its own states (a menu row's hover) beside the root's. */
function splitSlotKey(key: string): [string, string] {
  const i = key.search(/[:[]/)
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i)]
}
export const slotName = (key: string): string => splitSlotKey(key)[0]

export function recipeCss(recipe: ComponentRecipe): string {
  const rules: string[] = []
  for (const part of recipe.parts) {
    for (const [combo, slots] of Object.entries(part.values)) {
      const values = combo === '' ? [] : combo.split('|')
      let base = `[data-escala="${recipe.key}"]`
      let state = 'Default'
      part.axes.forEach((axis, i) => {
        if (axis === STATE_AXIS) state = values[i]
        else base += `[${attr(axis)}="${values[i]}"]`
      })
      const roots = stateSuffixes(recipe.key, state).map((s) => base + s)
      for (const [slotKey, props] of Object.entries(slots)) {
        const decl = declarations(props)
        if (!decl.length) continue
        const [slot, suffix] = splitSlotKey(slotKey)
        const sel = roots.map((r) => slotSelector(recipe, r, slot) + suffix).join(',\n')
        rules.push(`${sel} {\n  ${decl.join(';\n  ')};\n}`)
      }
    }
  }
  return rules.join('\n')
}

/** The whole sheet, every recipe. Static: computed once. */
export const RECIPE_CSS: string = Object.values(COMPONENT_RECIPES).map(recipeCss).join('\n\n')

/** Every custom property the sheet reads — what a container must provide. */
export function recipeCssVars(css: string = RECIPE_CSS): string[] {
  return [...new Set(css.match(/var\((--[a-z0-9_-]+)/g)?.map((m) => m.slice(4)) ?? [])].sort()
}
