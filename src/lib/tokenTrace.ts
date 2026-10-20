// Every token ONE inspected element is built from — colour, length and type —
// read off its recipe, property by property.
//
// `tokenInspector` answers "which colour ROLES paint this" (and matches a few
// lengths off the render). That is half a trace: a designer pointing at a
// Badge also needs to know its padding is `spacing.2`, its corner is
// `radius.pill`, its label is `type.caption`. The recipe already holds all of
// that — it is the table the stylesheet is generated from and the Figma plugin
// binds — so the trace is a READ of it, resolved against the tokens on screen:
//
//   slot (root · label · icon …) → property (Background, Padding X, Font …)
//     → token ref (`spacing.2`) → CSS variable (`--spacing-2`) → value (`8px`)
//
// Nothing here is measured or guessed. A property the recipe doesn't bind is
// not listed; a property it binds is listed even when it paints nothing visible
// in this state, because that is still the token it reads.

import { COMPONENT_RECIPES, cssVarOf, refFn, refFnPx, resolveRecipe, splitRef, type RecipeProp } from './componentRecipes'
import { previewDimension } from './recipeVars'
import { typeStyleOf } from './previewTokens'
import { SIZE_ROLES } from './layoutTokens'
import type { PreviewTokens } from '../components/preview/ButtonPreview'

/** What a traced value IS — decides its swatch, and which drawer opens it. */
export type TraceKind = 'color' | 'radius' | 'spacing' | 'size' | 'stroke' | 'type' | 'shadow'

export interface TraceFacet { label: string; cssVar: string; value: string }

export interface TraceRow {
  /** Stable React key. */
  key: string
  slot: string
  /** Interaction state the row belongs to (`hover`, `focus-visible`,
   *  `data-state="checked"`) — absent for the resting render. */
  state?: string
  prop: RecipeProp
  /** Human name of the property — `Background`, `Padding X`. */
  label: string
  kind: TraceKind
  /** The recipe's own reference — `color.action.primary.default`, `spacing.2`. */
  ref: string
  /** What `variables.css` calls it. A sum names each term. */
  cssVar: string
  /** The value in the theme / appearance / platform on screen. */
  value: string
  /** The id Token Details opens (`action.primary.default`, `radius.action`,
   *  `text.button`, `size.control`). Absent when no drawer edits this kind yet. */
  pickId?: string
  /** Type only: family, size, line height, weight, tracking. */
  facets?: TraceFacet[]
}

export interface TraceSlot {
  slot: string
  rows: TraceRow[]
}

export interface ElementTrace {
  component: string
  /** The axis values the trace was resolved for (`Variant: outline`). */
  axes: Record<string, string>
  slots: TraceSlot[]
}

const PROP_LABEL: Record<RecipeProp, string> = {
  fill: 'Background',
  text: 'Text color',
  stroke: 'Border color',
  ring: 'Focus ring',
  strokeTop: 'Top border',
  paint: 'Paint',
  radius: 'Radius',
  paddingX: 'Padding X',
  paddingY: 'Padding Y',
  paddingBottom: 'Padding bottom',
  gap: 'Gap',
  height: 'Height',
  minHeight: 'Min height',
  width: 'Width',
  travel: 'Travel',
  strokeWidth: 'Border width',
  strokeTopWidth: 'Top border width',
  strokeBottomWidth: 'Bottom border width',
  font: 'Typography',
  shadow: 'Shadow',
}

/** Display order inside a slot: paint first, then box, then type. */
const PROP_ORDER: RecipeProp[] = [
  'fill', 'text', 'stroke', 'strokeTop', 'ring', 'paint',
  'radius', 'paddingX', 'paddingY', 'paddingBottom', 'gap', 'height', 'minHeight', 'width', 'travel',
  'strokeWidth', 'strokeTopWidth', 'strokeBottomWidth', 'shadow', 'font',
]

function kindOf(ref: string): TraceKind {
  const ns = splitRef((refFn(ref)?.terms ?? ref.split('+'))[0])[0]
  switch (ns) {
    case 'color': return 'color'
    case 'radius': return 'radius'
    case 'spacing': return 'spacing'
    case 'stroke': return 'stroke'
    case 'type': return 'type'
    case 'shadow': return 'shadow'
    default: return 'size' // size · selector · icon
  }
}

/** The drawer id for a ref, in the convention `SemanticTokenDrawer` reads. */
function pickIdOf(ref: string): string | undefined {
  // A computed radius opens the role it follows (its first term).
  const f = refFn(ref)
  if (f) return pickIdOf(f.terms[0])
  if (ref.includes('+')) return undefined
  const [ns, name] = splitRef(ref)
  if (ns === 'color') return name
  if (ns === 'radius') return `radius.${name}`
  if (ns === 'type') return `text.${name}`
  // A size ROLE is editable; a raw step (`size.md`) is a primitive, not a role.
  if (ns === 'size' && SIZE_ROLES.some((role) => role.key === name)) return `size.${name}`
  // Spacing, stroke and shadow open `LayoutTokenDetails`: a role re-points,
  // a primitive step edits the scale (spacing through its base unit).
  if (ns === 'spacing' || ns === 'stroke' || ns === 'shadow') return `${ns}.${name}`
  return undefined
}

function sumPx(values: string[]): string {
  const nums = values.map((v) => parseFloat(v))
  if (nums.some((n) => !Number.isFinite(n))) return values.join(' + ')
  return `${Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100}px`
}

function resolveValue(t: PreviewTokens, ref: string): { cssVar: string; value: string; facets?: TraceFacet[] } {
  const f = refFn(ref)
  if (f) {
    const parts = f.terms.map((term) => resolveValue(t, term))
    const nums = parts.map((p) => parseFloat(p.value))
    const value = nums.every(Number.isFinite) ? `${refFnPx(f.fn, nums)}px` : parts[0].value
    return { cssVar: `${f.fn}(${parts.map((p) => p.cssVar).join(', ')})`, value }
  }
  const terms = ref.split('+')
  if (terms.length > 1) {
    const parts = terms.map((term) => resolveValue(t, term))
    return { cssVar: parts.map((p) => p.cssVar).join(' + '), value: sumPx(parts.map((p) => p.value)) }
  }
  const [ns, name] = splitRef(ref)
  if (ns === 'color') {
    return { cssVar: cssVarOf(ref), value: t.archTokens?.[name] ?? '' }
  }
  if (ns === 'type') {
    const s = typeStyleOf(t, name, { leading: true })
    const family = String(s.fontFamily ?? '').split(',')[0].replace(/["']/g, '').trim()
    const px = (v: unknown) => (v == null || v === '' ? '' : typeof v === 'number' ? `${v}px` : String(v))
    const facets: TraceFacet[] = [
      { label: 'Family', cssVar: cssVarOf(ref, 'font-family'), value: family },
      { label: 'Size', cssVar: cssVarOf(ref, 'font-size'), value: px(s.fontSize) },
      { label: 'Line height', cssVar: cssVarOf(ref, 'line-height'), value: px(s.lineHeight) },
      { label: 'Weight', cssVar: cssVarOf(ref, 'font-weight'), value: s.fontWeight == null ? '' : String(s.fontWeight) },
      { label: 'Tracking', cssVar: cssVarOf(ref, 'letter-spacing'), value: px(s.letterSpacing) || '0px' },
    ].filter((f) => f.value)
    const summary = [px(s.fontSize), px(s.lineHeight)].filter(Boolean).join(' / ')
    return { cssVar: `--text-${name}-*`, value: [summary, s.fontWeight].filter(Boolean).join(' · '), facets }
  }
  const out = previewDimension(t, ref)
  const cssVar = cssVarOf(ref)
  return { cssVar, value: out[cssVar] ?? Object.values(out)[0] ?? '' }
}

/** `root:hover` → ['root', 'hover'] · `item[data-state="checked"]` → ['item', 'data-state="checked"']. */
function splitSlotKey(key: string): [string, string | undefined] {
  const m = key.match(/^([^:[]+)(?::(.+)|\[(.+)\])?$/)
  if (!m) return [key, undefined]
  return [m[1], m[2] ?? m[3]]
}

/** The axis values a rendered root carries (`data-variant`, `data-size` …). */
export function axesOf(root: Element, recipeKey: string): Record<string, string> {
  const recipe = COMPONENT_RECIPES[recipeKey]
  const axes: Record<string, string> = {}
  if (!recipe) return axes
  for (const part of recipe.parts) {
    for (const axis of part.axes) {
      const v = axis === 'State'
        ? root.getAttribute('data-force-state')
        : root.getAttribute(`data-${axis.toLowerCase()}`)
      if (v) axes[axis] = v
    }
  }
  return axes
}

/** The recipe root an inspected marker wraps — itself, the descendant that IS
 *  the marker's component (a Switch inside its Field), else the first one. */
export function recipeRootOf(el: Element): Element | null {
  if (el.matches?.('[data-escala]')) return el
  const key = el.getAttribute?.('data-inspect')
  if (key) {
    const own = Array.from(el.querySelectorAll('[data-escala]')).find((node) => node.getAttribute('data-escala') === key)
    if (own) return own
  }
  return el.querySelector?.('[data-escala]') ?? null
}

/**
 * The full property trace of one recipe component render.
 *
 * Pure in everything but its input: pass the axes explicitly (a test, the docs)
 * or let `traceElement` read them off the DOM.
 */
export function traceRecipe(t: PreviewTokens, recipeKey: string, axes: Record<string, string> = {}): ElementTrace | null {
  const recipe = COMPONENT_RECIPES[recipeKey]
  if (!recipe) return null
  const resolved = resolveRecipe(recipe, axes)
  const bySlot = new Map<string, TraceRow[]>()
  const order = [...recipe.slots]

  for (const [key, props] of Object.entries(resolved)) {
    const [slot, state] = splitSlotKey(key)
    if (!order.includes(slot)) order.push(slot)
    const rows = bySlot.get(slot) ?? []
    for (const prop of PROP_ORDER) {
      const ref = props[prop]
      if (!ref || ref === 'none') continue
      const kind = kindOf(ref)
      const { cssVar, value, facets } = resolveValue(t, ref)
      if (!value && kind === 'color') continue // projection not active
      rows.push({
        key: `${key}|${prop}`,
        slot, state, prop, label: PROP_LABEL[prop] ?? prop, kind, ref, cssVar, value,
        pickId: pickIdOf(ref), facets,
      })
    }
    bySlot.set(slot, rows)
  }

  // Resting rows first, then each state's overrides, in recipe order.
  const slots: TraceSlot[] = order
    .map((slot) => {
      const rows = bySlot.get(slot) ?? []
      rows.sort((a, b) => (a.state ? 1 : 0) - (b.state ? 1 : 0))
      return { slot, rows }
    })
    .filter((s) => s.rows.length)

  return { component: recipeKey, axes: { ...recipe.defaults, ...axes }, slots }
}

/** The trace for a rendered element, or null when it isn't a recipe component. */
export function traceElement(t: PreviewTokens, el: Element): ElementTrace | null {
  const root = recipeRootOf(el)
  if (!root) return null
  const key = root.getAttribute('data-escala') ?? ''
  return traceRecipe(t, key, axesOf(root, key))
}

/** Which anatomy slot the node under the pointer belongs to — `label` for the
 *  text span of a Badge, `root` for the badge itself. */
export function slotUnder(el: Element, hit: Element | null, recipeKey: string): string | null {
  if (!hit) return null
  const root = recipeRootOf(el)
  if (!root || !root.contains(hit)) return null
  const part = hit.closest?.('[data-part]')
  if (part && root.contains(part)) {
    const name = part.getAttribute('data-part') ?? ''
    const [key, slot] = name.split('.')
    if (key === recipeKey && slot) return slot
  }
  return COMPONENT_RECIPES[recipeKey]?.slots[0] ?? null
}

/** How many distinct tokens a trace reads — the header count. */
export function traceTokenCount(trace: ElementTrace): number {
  const refs = new Set<string>()
  for (const s of trace.slots) for (const r of s.rows) for (const term of r.ref.split('+')) refs.add(term)
  return refs.size
}
