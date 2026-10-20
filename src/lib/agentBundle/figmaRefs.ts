// Recipe reference → the Figma object the plugin binds it to.
//
// MIRRORS the plugin (`escala-figma-plugin/src/code.ts`), which is the source
// of truth for what a Figma variable or style is called:
//   color.<role>        → `Color Semantics`     `Action/primary/default`
//   <dim>.<role>        → `Dimension Semantics` `Radius/role/action`, `Spacing/role/gap-group`
//   <dim>.<step>        → `Dimension Primitives` named by its px (`10`, `2_5`) —
//                         a bare step is not published as a semantic, the plugin
//                         binds "the Dimension primitive of that exact px"
//   icon.<role>         → `Dimension Semantics` `Icon/role/medium`
//   type.<role>         → text style `Type/label`
//   shadow.<step>       → effect style `Shadow/lg`
// A reference this system does not publish resolves to null: a skill writes
// "not published" instead of inventing a name.

import { dimensionKey } from '../dimensionCore'
import { figmaSemanticName } from './names'
import type { TokenJSON } from './types'

export type FigmaCollection =
  | 'Color Semantics'
  | 'Dimension Semantics'
  | 'Dimension Primitives'
  | 'Text style'
  | 'Effect style'

export interface FigmaRef {
  collection: FigmaCollection
  name: string
}

const DIM_GROUP: Record<string, { group: string; scale: (j: TokenJSON) => Record<string, string> | undefined; roles: (j: TokenJSON) => Record<string, string> | undefined }> = {
  radius: { group: 'Radius', scale: (j) => j.radius, roles: (j) => j.radiusRoles },
  spacing: { group: 'Spacing', scale: (j) => j.spacing, roles: (j) => j.spacingRoles },
  size: { group: 'Size', scale: (j) => j.sizes, roles: (j) => j.sizeRoles },
  selector: { group: 'Selector', scale: (j) => j.selector, roles: (j) => j.selectorRoles },
  stroke: { group: 'Stroke', scale: (j) => j.stroke, roles: (j) => j.strokeRoles },
}

/** Every Categorical role id the payload ships (`action.primary.default`). */
export function semanticRoleIds(json: TokenJSON): Set<string> {
  const ids = new Set<string>()
  for (const [group, tokens] of Object.entries(json.colors.architecture?.tokens ?? {})) {
    for (const key of Object.keys(tokens)) ids.add(`${group}.${key}`)
  }
  return ids
}

function px(raw: string | undefined): number | null {
  const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*(px)?\s*$/i.exec(String(raw ?? ''))
  return m ? Number(m[1]) : null
}

/** One term (no `+`). */
function oneRef(ref: string, json: TokenJSON, roles: Set<string>): FigmaRef | null {
  const dot = ref.indexOf('.')
  const ns = dot < 0 ? ref : ref.slice(0, dot)
  const name = dot < 0 ? '' : ref.slice(dot + 1)
  if (ns === 'color') return roles.has(name) ? { collection: 'Color Semantics', name: figmaSemanticName(name) } : null
  if (ns === 'type') return json.typography?.roles?.[name] ? { collection: 'Text style', name: `Type/${name}` } : null
  if (ns === 'shadow') return json.shadows?.[name] ? { collection: 'Effect style', name: `Shadow/${name}` } : null
  if (ns === 'icon') return json.icons?.sizes?.roles?.[name] ? { collection: 'Dimension Semantics', name: `Icon/role/${name}` } : null
  const dim = DIM_GROUP[ns]
  if (!dim) return null
  if (dim.roles(json)?.[name] !== undefined) return { collection: 'Dimension Semantics', name: `${dim.group}/role/${name}` }
  const value = px(dim.scale(json)?.[name])
  if (value === null) return null
  const key = dimensionKey(value)
  return json.dimensions && !(key in json.dimensions) ? null : { collection: 'Dimension Primitives', name: key }
}

/** A reference → the Figma objects it binds. A sum (`selector.control+spacing.1`)
 *  has no single variable: every term is returned, and null if any is unknown. */
export function figmaRefsFor(ref: string, json: TokenJSON, roles = semanticRoleIds(json)): FigmaRef[] | null {
  const out: FigmaRef[] = []
  // A computed radius (`min(a,b)`, `sub(a,b)`) follows its first term, a role.
  const cap = /^(?:min|sub)\((.+)\)$/.exec(ref)
  for (const term of cap ? [cap[1].split(',')[0].trim()] : ref.split('+')) {
    const r = oneRef(term, json, roles)
    if (!r) return null
    out.push(r)
  }
  return out
}

// ── Layers ─────────────────────────────────────────────────────────────────

/** Properties the plugin binds as a VARIABLE (`PAINT_PROPS` + `GEOMETRY_PROPS`
 *  in the plugin's recipes.ts), then the two it applies as a STYLE. */
export const FIGMA_VARIABLE_PROPS = [
  'fill', 'stroke', 'text', 'ring',
  'paddingX', 'paddingY', 'paddingBottom', 'gap', 'radius', 'strokeWidth', 'strokeTopWidth', 'strokeBottomWidth', 'height', 'minHeight', 'width',
] as const
export const FIGMA_STYLE_PROPS = ['font', 'shadow'] as const
const FIGMA_PROPS = new Set<string>([...FIGMA_VARIABLE_PROPS, ...FIGMA_STYLE_PROPS])
export function isFigmaProp(prop: string): boolean {
  return FIGMA_PROPS.has(prop)
}

/** What a designer calls each property in Figma's right panel. */
export const FIGMA_PROP_LABEL: Record<string, string> = {
  fill: 'Fill',
  stroke: 'Stroke',
  text: 'Text fill',
  ring: 'Focus ring (effect colour)',
  paddingX: 'Horizontal padding',
  paddingY: 'Vertical padding',
  paddingBottom: 'Bottom padding',
  gap: 'Gap',
  radius: 'Corner radius',
  strokeWidth: 'Stroke weight',
  strokeTopWidth: 'Stroke weight (top)',
  strokeBottomWidth: 'Stroke weight (bottom)',
  height: 'Height',
  minHeight: 'Min height',
  width: 'Width',
  font: 'Text style',
  shadow: 'Effect style',
}

/** A web-only pseudo state (`root:hover`) — in Figma a state is a variant of
 *  the State property, painted from its own axis values, not a layer. */
export function isPseudoSlot(slot: string): boolean {
  return slot.includes(':')
}

/**
 * The Figma layer a slot is drawn on. MIRRORS the plugin's `slotQualifier`:
 * a data state is a suffix — `item[data-highlighted]` → `item-highlighted`,
 * `node[data-state="done"]` → `node-done`, `cell[data-active="true"]` → `cell-active`.
 * The first slot of a recipe is the component itself (`root`).
 */
export function figmaLayerName(slot: string): string {
  const m = /^([A-Za-z]+)\[([a-z-]+)(?:="([^"]*)")?\]$/.exec(slot)
  if (!m) return slot
  const attr = m[2].replace(/^(?:data|aria)-/, '')
  const value = m[3]
  return `${m[1]}-${value === undefined || value === 'true' ? attr : value}`
}

/** The base slot a layer name carries (`item-highlighted` → `item`). */
export function slotBase(slot: string): string {
  return slot.replace(/\[.*$/, '').replace(/:.*$/, '')
}
