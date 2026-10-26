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
  COMPONENT_RECIPES, cssVarOf, refFn, refFnCss, type ComponentRecipe, type RecipeChoreo, type RecipeProp, type SlotProps,
} from './componentRecipes.js'
import {
  MOTION_PRESETS, choreographyVar, defaultMotionSettings, motionChoreographies, motionKeyframesCss, type Choreography,
} from './motion.js'

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

const HALO = 'calc(var(--stroke-focus, 2px) + var(--stroke-control, 1px))'

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
      // One hairline on one side (an accordion row's divider, a tab strip's underline).
      case 'strokeTopWidth': out.push(`border-top-width: ${dim(ref)}`, 'border-top-style: solid'); break
      case 'strokeBottomWidth': out.push(`border-bottom-width: ${dim(ref)}`, 'border-bottom-style: solid'); break
      // The halo outside a focused control: `stroke.focus` + one hairline, i.e.
      // shadcn's 3px at the default stroke ramp. Alone it is a FIELD's halo;
      // with `focus` it is composed into one box-shadow below.
      case 'ring':
        if (props.focus && props.focus !== 'none') break
        out.push(ref === 'none' ? 'box-shadow: none' : `box-shadow: 0 0 0 ${HALO} ${v(ref)}`)
        break
      // shadcn's `focus-visible:border-ring ring-[3px]`: the edge turns to
      // `border.focus` (an inset `stroke.focus` ring, so a borderless button
      // draws it too and nothing shifts) and the halo sits outside. The
      // transparent outline is what forced-colors mode paints instead of both.
      case 'focus': {
        if (ref === 'none') { out.push('box-shadow: none', 'outline: none'); break }
        const halo = props.ring && props.ring !== 'none' ? `, 0 0 0 ${HALO} ${v(props.ring)}` : ''
        out.push(
          `border-color: ${v(ref)}`,
          `box-shadow: inset 0 0 0 var(--stroke-focus, 2px) ${v(ref)}${halo}`,
          'outline: var(--stroke-focus, 2px) solid transparent',
        )
        break
      }
      case 'height': out.push(`height: ${dim(ref)}`); break
      case 'minHeight': out.push(`min-height: ${dim(ref)}`); break
      case 'width': out.push(`width: ${dim(ref)}`); break
      // A custom property the part reads (a switch thumb's travel); not a CSS property.
      case 'travel': out.push(`--escala-travel: ${dim(ref)}`); break
      case 'radius': {
        const f = refFn(ref)
        out.push(`border-radius: ${f ? refFnCss(f, (r) => v(r)) : v(ref)}`)
        break
      }
      case 'paddingX': out.push(`padding-inline: ${dim(ref)}`); break
      case 'paddingY': out.push(`padding-block: ${dim(ref)}`); break
      // The bottom inset alone (an accordion answer hugs its question above it).
      case 'paddingBottom': out.push(`padding-bottom: ${dim(ref)}`); break
      case 'gap': out.push(`gap: ${dim(ref)}`); break
      // The gap between ROWS when it differs from `gap` (an Alert's icon column
      // sits 12px off the text while title and description sit 2px apart).
      case 'rowGap': out.push(`row-gap: ${dim(ref)}`); break
      case 'strokeWidth': out.push(`border-width: ${v(ref)}`, 'border-style: solid'); break
      case 'shadow': out.push(`box-shadow: ${v(ref)}`); break
      // The target itself is the `::before` (see `hitRule`); its host anchors it.
      case 'hit': out.push('position: relative'); break
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

/** A glyph under 24px keeps its size; a transparent `::before` centred on it
 *  is at least `size.hit` square, so the pointer target meets WCAG 2.5.8. */
function hitRule(sel: string, ref: string): string {
  const hit = `var(${cssVarOf(ref)})`
  return `${sel.split(',\n').map((s) => `${s}::before`).join(',\n')} {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100%, ${hit});
  height: max(100%, ${hit});
  transform: translate(-50%, -50%);
}`
}

function slotSelector(recipe: ComponentRecipe, root: string, slot: string): string {
  if (slot === recipe.slots[0]) return root
  const own = recipe.dom?.slots?.[slot]
  if (own) return `${root} ${own}`
  if (recipe.detachedSlots?.includes(slot)) return `[data-part="${recipe.key}.${slot}"]`
  const pseudo = recipe.pseudoSlots?.[slot]
  if (pseudo) {
    // A pseudo-element of the root itself (shadcn's Input: the box IS the <input>).
    if (pseudo.of === recipe.slots[0]) return `${root}${pseudo.pseudo}`
    return `${root} [data-part="${recipe.key}.${pseudo.of}"]${pseudo.pseudo}`
  }
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
      let base = recipe.dom?.root ?? `[data-escala="${recipe.key}"]`
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
        if (props.hit && props.hit !== 'none') rules.push(hitRule(sel, props.hit))
      }
    }
  }
  return rules.join('\n')
}

// ── Motion ─────────────────────────────────────────────────────────────────
//
// Transitions read a motion ROLE (`var(--motion-use-hover)` = "<duration>
// <easing>"); choreographies read one custom property per track that holds the
// whole `animation` shorthand (`--motion-choreo-dialog-enter-content`). The
// container supplies both (`variables.css`, or a preview scope from
// `motionCssVars`), so the static sheet retimes with the preset. They are CSS
// animations, not script: Radix keeps a closing layer mounted until its CSS
// exit animation ends, which a Web Animations runtime would not get.

/** What a transition falls back to with no motion tokens around it: the
 *  150 ms ease the components used before motion was a foundation. */
const TRANSITION_FALLBACK = '150ms cubic-bezier(0.4, 0, 0.2, 1)'

/** Radix's open states (a Tooltip has two). `data-inline` is a preview drawn in
 *  place, already open: it must not play its entrance on every board render. */
const OPEN = ['[data-state="open"]', '[data-state="delayed-open"]', '[data-state="instant-open"]']
const CLOSED = ['[data-state="closed"]']
const LIVE = ':not([data-inline])'
const SIDES = ['top', 'right', 'bottom', 'left'] as const

/** The structure of every choreography (slots, keyframes). Identical for every
 *  preset — only the values behind the custom properties change. */
const CHOREOGRAPHIES = motionChoreographies(defaultMotionSettings())

function choreographyRules(recipe: ComponentRecipe, root: string, c: RecipeChoreo, states: string[]): string[] {
  const def = CHOREOGRAPHIES[c.name]
  if (!def) return []
  const rules: string[] = []
  const at = (el: string) => states.map((st) => `${el}${st}${LIVE}`).join(',\n')
  if (def.pattern === 'disclosure') {
    const el = slotSelector(recipe, root, c.slot ?? recipe.slots[0])
    if (c.heightVar) rules.push(`${el} {\n  --escala-disclosure-height: var(${c.heightVar});\n  overflow: hidden;\n}`)
    rules.push(`${at(el)} {\n  animation: var(${choreographyVar(c.name)}, none);\n}`)
    return rules
  }
  for (const t of def.tracks ?? []) {
    const slot = t.slot ?? c.slot ?? recipe.slots[0]
    const el = slotSelector(recipe, root, slot)
    rules.push(`${at(el)} {\n  animation: var(${choreographyVar(c.name, t.slot)}, none);\n}`)
    // A panel that slides: the keyframes follow the edge it is attached to.
    // Only with full motion — reduced motion swaps the slide for a fade.
    const side = recipe.motion?.sideAttr
    if (side && slot === recipe.slots[0] && /-right$/.test(t.keyframes)) {
      const per = SIDES.map((edge) => `${states.map((st) => `${el}[data-${side}="${edge}"]${st}${LIVE}`).join(',\n')} {\n  animation-name: motion-${t.keyframes.replace(/-right$/, `-${edge}`)};\n}`)
      rules.push(`@media (prefers-reduced-motion: no-preference) {\n${per.join('\n')}\n}`)
    }
  }
  return rules
}

/** The transitions and choreographies of one recipe. */
export function recipeMotionCss(recipe: ComponentRecipe): string {
  const m = recipe.motion
  if (!m) return ''
  const root = recipe.dom?.root ?? `[data-escala="${recipe.key}"]`
  const rules: string[] = []
  for (const [slotKey, props] of Object.entries(m.transitions ?? {})) {
    const [slot, suffix] = splitSlotKey(slotKey)
    const sel = slotSelector(recipe, root, slot) + suffix
    const list = Object.entries(props).map(([prop, role]) => `${prop} var(--motion-${role}, ${TRANSITION_FALLBACK})`)
    rules.push(`${sel} {\n  transition: ${list.join(', ')};\n}`)
  }
  if (m.origin) rules.push(`${slotSelector(recipe, root, m.enter?.slot ?? recipe.slots[0])} {\n  transform-origin: ${m.origin};\n}`)
  if (m.enter) rules.push(...choreographyRules(recipe, root, m.enter, OPEN))
  if (m.exit) rules.push(...choreographyRules(recipe, root, m.exit, CLOSED))
  // A disclosure's enter and exit both declare its height: once is enough.
  return [...new Set(rules)].join('\n')
}

/** The keyframes a component's choreography can name — under any preset, with
 *  full or reduced motion, on any edge. The sheet carries those and no others
 *  (a list's stagger, a switch's squash are data for a product's own runtime). */
export function playedKeyframes(recipes: readonly ComponentRecipe[] = Object.values(COMPONENT_RECIPES)): string[] {
  const names = new Set<string>()
  const used = new Set(recipes.flatMap((r) => [r.motion?.enter?.name, r.motion?.exit?.name]).filter(Boolean))
  const add = (body: Choreography | Choreography['reducedMotion']) => {
    for (const t of body.tracks ?? []) {
      names.add(t.keyframes)
      if (/-right$/.test(t.keyframes)) SIDES.forEach((edge) => names.add(t.keyframes.replace(/-right$/, `-${edge}`)))
    }
    if (body.pattern === 'disclosure') names.add(body.direction === 'collapse' ? 'disclosure-collapse' : 'disclosure-expand')
  }
  for (const preset of Object.values(MOTION_PRESETS)) {
    for (const [name, c] of Object.entries(motionChoreographies(preset.settings))) {
      if (!used.has(name)) continue
      add(c)
      add(c.reducedMotion)
    }
  }
  return [...names].sort()
}

/** The whole sheet, every recipe, and the keyframes the choreographies play.
 *  Static: computed once. */
export const RECIPE_CSS: string = [
  ...Object.values(COMPONENT_RECIPES).map(recipeCss),
  ...Object.values(COMPONENT_RECIPES).map(recipeMotionCss).filter(Boolean),
  motionKeyframesCss(playedKeyframes()).join('\n'),
].join('\n\n')

/** Every custom property the sheet reads — what a container must provide.
 *  Not counted: a property the sheet declares itself (a disclosure's height)
 *  and one Radix publishes on its own element (`--radix-*`, a popper's origin
 *  or a panel's measured height). Neither is a token. */
export function recipeCssVars(css: string = RECIPE_CSS): string[] {
  const own = new Set(css.match(/--[a-z0-9_-]+(?=:)/g) ?? [])
  return [...new Set(css.match(/var\((--[a-z0-9_-]+)/g)?.map((m) => m.slice(4)) ?? [])]
    .filter((v) => !own.has(v) && !v.startsWith('--radix-'))
    .sort()
}
