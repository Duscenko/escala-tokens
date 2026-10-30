// Which semantic roles a catalogue component actually paints with — the data
// behind Inspector mode's badge.
//
// DERIVED, never listed. Every catalogue component is built on the shadcn
// skeleton and described by a RECIPE (`lib/componentRecipes`): the exact table of
// tokens that paint each part, the same one the web stylesheet is generated from
// and the Figma plugin binds. The inspector reads it, so it can only ever name a
// role the component genuinely reads. (It used to walk each specimen's call graph
// to reconstruct this; that generator is gone with the specimens it read.)
//
// The cost of deriving it is a known blind spot, stated rather than hidden:
// see `INSPECTOR_BLIND_SPOT` below.

import { compositeOver } from './colorUtils'
import { COMPONENT_RECIPES, recipeColorRoles, recipeRolesFor, resolveRecipe } from './componentRecipes'
import { wcagRatio } from './color/apca'
import { RADIUS_ROLES, SIZE_CONTROL_MIN_PX, SIZE_ROLES } from './layoutTokens'
import { CATEGORICAL_FIELD_ROLE, radiusRoleOf, sizeRoleOf } from './previewTokens'
import { TYPE_ROLES, typeStyleCss } from './typeRoles'
import type { PreviewTokens } from '../components/preview/ButtonPreview'

/** Where a role was OBSERVED on the element — a fill, the ink of a glyph or
 *  a run of text, or a stroke. The badge shows it so a row reads as a place on
 *  the component rather than a name in a list. */
export type PaintSlot = 'fill' | 'ink' | 'stroke'

/** Colour is the measured paint. The other three are length roles matched
 *  off the same render: a corner, a run of text, the control's own height. */
export type InspectKind = 'color' | 'radius' | 'text' | 'size'

/**
 * A role the inspector reports for a component, with its value in the theme
 * currently on screen. For a colour, `css` is whatever `archTokens` resolved
 * — an 8-digit hex for the 16 alpha-backed roles, so the badge must be able
 * to render a translucent swatch (see `TokenInspector`'s checkerboard). For
 * a length role it is the resolved px (`8px`).
 */
export interface InspectedRole {
  /** Fully qualified id — `action.primary.default`, `radius.action`,
   *  `text.button`, `size.control`. */
  id: string
  css: string
  /** Absent when the row comes from the component's declared UNION rather
   *  than from a colour measured on the rendered element. */
  where?: PaintSlot
  /** Absent on a colour row. Length rows set it so the badge can group them
   *  and so a click does not open the colour drawer. */
  kind?: InspectKind
}

/** One element's roles, plus whether they were measured off the render. */
export interface Inspection {
  roles: InspectedRole[]
  /**
   * `false` when nothing on the element resolved to a role and `roles` is the
   * component's whole union instead — the honest wider answer, and the state
   * `INSPECTOR_BLIND_SPOT` is written for.
   */
  measured: boolean
}

/**
 * What the derivation CANNOT see, so nobody mistakes an empty badge for a
 * component that uses no colour.
 *
 * A component's recipe names every role it paints (`rolesForComponent`), and a
 * measured inspection reads the colours off the rendered element, where any
 * source of a paint is indistinguishable from another. What remains invisible is
 * a colour a piece of markup mixes itself (`soft()`, `tintOf()`, `darken()`):
 * it exists in no ramp, so there is no role to name — the fix is binding an
 * alpha role, not more analysis. The badge still UNDER-reports: it never names a
 * role a component doesn't paint, so what is listed is always true.
 */
export const INSPECTOR_BLIND_SPOT =
  'Colours a specimen mixes itself (soft washes, derived hovers) match no token, so they are not listed.'

/**
 * The roles a component consumes: the union over its whole recipe, across every
 * axis combination.
 *
 * THIS IS THE COMPONENT'S UNION, NOT THE RENDERED VARIANT. A Solid Brand button's
 * union also lists the four `status.*` solids its Danger / Success variants use.
 * That answers "which roles does this component consume" and not "which roles
 * paint THIS button" — `inspectElement` answers the second (`recipeInspection`
 * resolves the recipe for the element's own axes). Two jobs, two functions.
 */
export function rolesForComponent(componentKey: string): string[] {
  const recipe = COMPONENT_RECIPES[componentKey]
  return recipe ? recipeColorRoles(recipe) : []
}

/**
 * The roles for a component, resolved against the theme on screen.
 *
 * A role with no entry in `archTokens` is DROPPED, not shown as a blank: the
 * map is populated only under the Categorical architecture, and a badge
 * listing ids with no colour beside them would imply the tokens are broken
 * rather than that the projection isn't active.
 */
export function inspectComponent(t: PreviewTokens, componentKey: string): InspectedRole[] {
  const arch = t.archTokens
  if (!arch) return []
  return rolesForComponent(componentKey)
    .map((id) => ({ id, css: arch[id] }))
    .filter((r): r is InspectedRole => !!r.css)
}

// ── Measured inspection: which roles paint THIS element ──────────────────────
//
// Pointing at one Solid button and being handed ten roles — six of which
// belong to variants that aren't on screen — is the component's answer to a
// question about a pixel. The fix is to ask the render: read the computed
// colours off the element and match them back to the theme's own resolved
// values, so a Solid Brand button reports exactly its fill and its label ink.
//
// DERIVED, like everything else here, and derived one step CLOSER to the truth
// than the field closure: a colour on screen cannot be a colour the component
// doesn't paint. It also closes half of `INSPECTOR_BLIND_SPOT` for free — a
// role read straight off `archTokens` (`status.*.border`, `surface.input`, the
// ghost washes) is invisible to the generator's AST walk but perfectly visible
// as a border colour in `getComputedStyle`.
//
// The declared union stays load-bearing for DISAMBIGUATION. Roles legitimately
// share values (`content.on-action == content.inverse`, `surface.inverse ==
// surface.overlay` in light), so one observed hex can name two roles; the one
// the component actually reads wins. Without that step a Solid button would
// report `content.inverse` beside `content.on-action` and be right twice about
// the same pixel, which is exactly the noise this is removing.

/** How many descendants to read per element. A collage module is ~40 nodes;
 *  the cap only exists so a pathological subtree can't stall a pointermove. */
const MAX_NODES = 400

const rgbaKey = (r: number, g: number, b: number, a: number) =>
  `${r},${g},${b},${a.toFixed(2)}`

/**
 * A CSS colour reduced to `r,g,b,a` so a computed style (`rgb()` / `rgba()`)
 * can be compared with a token's hex.
 *
 * Alpha is compared at two decimals, and that is exact rather than tolerant:
 * both sides descend from the same 8-bit channel — the token's `aa` and the
 * value the browser resolved from it — so they round identically.
 *
 * Fully transparent returns `null`: nothing is painted, and `transparent` is
 * what every specimen writes for "this style has no fill/stroke", so matching
 * it would report a role for the absence of one.
 */
/**
 * The measured paint as the hex the rest of the app speaks (`#rrggbb`, or
 * `#rrggbbaa` when the pixel is translucent). The swatch still paints
 * `role.css` itself — this is only the label beside it, so `rgb()` from
 * `getComputedStyle` and a token hex read as the same string.
 */
export function displayHex(css: string): string {
  const key = normalizeColor(css)
  if (!key) return css
  const [r, g, b, a] = key.split(',').map(Number)
  const channel = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  const body = `#${channel(r)}${channel(g)}${channel(b)}`
  if (!Number.isFinite(a) || a >= 0.995) return body
  return `${body}${channel(a * 255)}`
}

export function normalizeColor(css: string | null | undefined): string | null {
  if (!css) return null
  const value = css.trim().toLowerCase()
  if (!value || value === 'transparent' || value === 'currentcolor' || value === 'none') return null

  if (value[0] === '#') {
    const hex = value.slice(1)
    if (hex.length !== 3 && hex.length !== 4 && hex.length !== 6 && hex.length !== 8) return null
    const short = hex.length <= 4
    const channel = (i: number) =>
      parseInt(short ? hex[i] + hex[i] : hex.slice(i * 2, i * 2 + 2), 16)
    const r = channel(0), g = channel(1), b = channel(2)
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
    const alpha = short ? hex.length === 4 : hex.length === 8
    const a = alpha ? channel(3) / 255 : 1
    return a === 0 ? null : rgbaKey(r, g, b, a)
  }

  if (!value.startsWith('rgb')) return null
  const parts = value.match(/-?[\d.]+%?/g)
  if (!parts || parts.length < 3) return null
  const channel = (raw: string) =>
    Math.round(raw.endsWith('%') ? parseFloat(raw) * 2.55 : parseFloat(raw))
  const r = channel(parts[0]), g = channel(parts[1]), b = channel(parts[2])
  const raw = parts[3]
  const a = raw == null ? 1 : (raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw))
  if (![r, g, b, a].every(Number.isFinite)) return null
  return a === 0 ? null : rgbaKey(r, g, b, a)
}

/** value → role ids, built once per resolved token map. Several roles can
 *  share a value, so this is one-to-many by construction. */
const INDEX_CACHE = new WeakMap<Record<string, string>, Map<string, string[]>>()

function roleIndex(arch: Record<string, string>): Map<string, string[]> {
  const cached = INDEX_CACHE.get(arch)
  if (cached) return cached
  const index = new Map<string, string[]>()
  for (const [id, css] of Object.entries(arch)) {
    const key = normalizeColor(css)
    if (!key) continue
    const bucket = index.get(key)
    if (bucket) bucket.push(id)
    else index.set(key, [id])
  }
  INDEX_CACHE.set(arch, index)
  return index
}

/** PreviewTokens field values → role ids. A specimen often paints
 *  `t.errorColor` (the primitive ramp) while `archTokens` carries the solved
 *  projection — byte-different, same role. */
function fieldRoleIndex(
  t: PreviewTokens,
  fields: string[],
): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const field of fields) {
    const id = CATEGORICAL_FIELD_ROLE[field]
    if (!id) continue
    const val = t[field as keyof PreviewTokens]
    if (typeof val !== 'string') continue
    const key = normalizeColor(val)
    if (!key) continue
    const bucket = index.get(key) ?? []
    if (!bucket.includes(id)) bucket.push(id)
    index.set(key, bucket)
  }
  return index
}

function parseInspectVariant(el: Element): Record<string, string> | null {
  const raw = el.getAttribute('data-inspect-variant')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function roleAt(
  arch: Record<string, string>,
  paints: { css: string; where: PaintSlot }[],
  id: string,
  where: PaintSlot,
): InspectedRole | null {
  if (!arch[id]) return null
  // Match the paint that IS this role's colour first; only fall back to
  // "the first paint in this slot" when nothing measured that value (a
  // state variant, say, where the rendered fill is the hover tone rather
  // than the role's own). Slot alone is not enough the moment a component
  // paints two of the same kind: Toast asks for `surface.inverse` AND
  // `status.<sev>.content` (the dot), both fills, and both used to resolve
  // to the first fill observed — so the dot's row was stamped with the chip
  // instead of its own red/green.
  const want = normalizeColor(arch[id])
  const paint = paints.find((p) => p.where === where && want && normalizeColor(p.css) === want)
    ?? paints.find((p) => p.where === where)
  return { id, css: paint?.css ?? arch[id], where }
}

/**
 * The roles a catalogue variant MEANS to paint, read from its recipe (the same
 * table the stylesheet and the Figma plugin paint from): every slot's fill,
 * ink and stroke for these axis values, root first. Measured paint css is
 * kept on the swatch when present.
 */
export function resolveVariantRoles(
  t: PreviewTokens,
  componentKey: string,
  variant: Record<string, string>,
  paints: { css: string; where: PaintSlot }[],
): InspectedRole[] | null {
  const arch = t.archTokens
  const recipe = COMPONENT_RECIPES[componentKey]
  if (!arch || !recipe) return null
  const slots = resolveRecipe(recipe, variant)
  const order = [recipe.slots[0], ...Object.keys(slots).filter((k) => k !== recipe.slots[0] && !/[:[]/.test(k))]
  const seen = new Set<string>()
  const roles: InspectedRole[] = []
  for (const slot of order) {
    const props = slots[slot]
    if (!props) continue
    for (const [prop, where] of [['fill', 'fill'], ['text', 'ink'], ['stroke', 'stroke']] as const) {
      const ref = props[prop]
      if (!ref?.startsWith('color.')) continue
      const id = ref.slice(6)
      if (seen.has(`${id}|${where}`)) continue
      seen.add(`${id}|${where}`)
      const role = roleAt(arch, paints, id, where)
      if (role) roles.push(role)
    }
  }
  return roles.length ? roles : null
}

/**
 * Ink is only painted where there are glyphs. `color` inherits, so every
 * wrapper in the subtree reports the page's text colour whether it renders a
 * character or not — which is how a Solid button ends up claiming
 * `content.primary` from the `Live` wrapper around it. A node with no direct
 * text node paints no ink.
 */
function paintsText(node: Element): boolean {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 && (child.textContent ?? '').trim()) return true
  }
  return false
}

interface Observation { key: string; where: PaintSlot; css: string }

function observeNode(
  node: Element,
  out: Observation[],
  seen: Set<string>,
): void {
  const cs = getComputedStyle(node)
  // A `display: contents` marker generates no box, so it paints nothing —
  // reading it would attribute its inherited ink to the component.
  if (cs.display === 'contents') return
  const push = (css: string | null | undefined, where: PaintSlot) => {
    const key = normalizeColor(css)
    if (!key || !css) return
    const tag = `${key}|${where}`
    if (seen.has(tag)) return
    seen.add(tag)
    out.push({ key, where, css })
  }
  const masked = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none')
  // A masked span IS a glyph (see `PreviewIcon`): its background is the
  // icon's ink, not a surface fill.
  push(cs.backgroundColor, masked ? 'ink' : 'fill')
  if (paintsText(node)) push(cs.color, 'ink')
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const width = parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`))
    if (!(width > 0)) continue
    if (cs.getPropertyValue(`border-${side.toLowerCase()}-style`) === 'none') continue
    push(cs.getPropertyValue(`border-${side.toLowerCase()}-color`), 'stroke')
  }
  if (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') push(cs.outlineColor, 'stroke')
  // Charts, logos and drawn glyphs paint through SVG, which `background` and
  // `border` never see. Only real shapes count: a `<g>` or `<svg>` reports the
  // inherited default black fill without drawing anything.
  if (SVG_SHAPES.has(node.tagName.toLowerCase())) {
    if (node.tagName.toLowerCase() !== 'line' && cs.fill && cs.fill !== 'none' && parseFloat(cs.fillOpacity) > 0) push(cs.fill, 'fill')
    if (cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && parseFloat(cs.strokeOpacity) > 0) push(cs.stroke, 'stroke')
  }
}

const SVG_SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text'])

/** Every colour the element and its descendants actually paint, in paint
 *  order — fill, then ink, then strokes, walking down the tree. */
function observePaints(root: Element): Observation[] {
  const out: Observation[] = []
  const seen = new Set<string>()
  const nodes = [root, ...Array.from(root.querySelectorAll('*')).slice(0, MAX_NODES)]
  for (const node of nodes) observeNode(node, out, seen)
  return out
}

/** Paints on the container itself — the card fill, its stroke — skipping
 *  anything already owned by a `[data-inspect]` child. Those children are
 *  measured separately so a button's green cannot be re-attributed as the
 *  module chrome. */
function observeChromePaints(root: Element): Observation[] {
  const out: Observation[] = []
  const seen = new Set<string>()
  const nodes = [root, ...Array.from(root.querySelectorAll('*')).slice(0, MAX_NODES)]
  for (const node of nodes) {
    if (node !== root && node.closest('[data-inspect]')) continue
    observeNode(node, out, seen)
  }
  return out
}

/**
 * Map observed paints back to role ids.
 *
 * `declared` is the component's field-closure union. When it is non-empty,
 * ONLY those ids may be reported — a hex that also belongs to an unrelated
 * role (`content.accent` sharing a button's fill, `surface.layer-1` sharing
 * a social-login well) must not sneak in. Falling through to every role
 * with that hex is what made Token Details open on a primitive that was
 * never the pixel you pointed at.
 *
 * The swatch is the MEASURED css, not `arch[id]`. Those two disagree the
 * moment a try-on overlay, an optimistic hue drag, or a hex collision is
 * in play; the badge has to show the colour on screen.
 */
export function rolesForPaints(
  arch: Record<string, string>,
  declared: string[],
  paints: { css: string; where: PaintSlot }[],
  fieldIndex?: Map<string, string[]>,
): InspectedRole[] {
  const index = roleIndex(arch)
  const roles: InspectedRole[] = []
  for (const paint of paints) {
    const key = normalizeColor(paint.css)
    if (!key) continue
    const fromArch = index.get(key) ?? []
    const fromField = fieldIndex?.get(key) ?? []
    const candidates = [...new Set([...fromArch, ...fromField])]
    if (!candidates.length) continue
    const owned = declared.length
      ? candidates.filter((id) => declared.includes(id))
      : candidates
    // Two roles can share a hex (`border.accent` and `action.primary.default`
    // are one tone): the slot decides which one this paint is. A stroke takes
    // the border role when there is one; a fill or an ink never does.
    const isBorder = (id: string) => id.startsWith('border.') || /\.border(-|$)/.test(id)
    const slotted = owned.filter((id) => (paint.where === 'stroke') === isBorder(id))
    for (const id of slotted.length ? slotted : owned) {
      if (roles.some((role) => role.id === id)) continue
      roles.push({ id, css: paint.css, where: paint.where })
    }
  }
  return roles
}

/**
 * A solid fill carries a paired ink. Button's declared union maps the
 * label of every Solid to `content.on-action` (`onBrand`), so a Danger
 * button's near-white ink was reported as the brand pair — and
 * `status.critical.on-solid` never appeared, even though that is what
 * `statusOn()` actually paints. Once the fill is a status/brand solid,
 * the badge lists that fill and its own on-ink, nothing else.
 */
const SOLID_INK: Record<string, string> = {
  'status.critical.surface-solid': 'status.critical.on-solid',
  'status.warning.surface-solid': 'status.warning.on-solid',
  'status.success.surface-solid': 'status.success.on-solid',
  'status.info.surface-solid': 'status.info.on-solid',
  'action.primary.default': 'content.on-action',
}

export function pairSolidRoles(
  arch: Record<string, string>,
  roles: InspectedRole[],
  paints: { css: string; where: PaintSlot }[],
): InspectedRole[] {
  const fill = Object.keys(SOLID_INK)
    .map((id) => roles.find((role) => role.where === 'fill' && role.id === id))
    .find((role): role is InspectedRole => !!role)
  if (!fill) return roles
  // The solid has to be the element's own surface — the first fill the walk
  // meets. A StatusBadge's Busy DOT is a critical solid too, but the label
  // beside it sits on the badge, so renaming its ink to `on-solid` was wrong.
  const rootFill = paints.find((paint) => paint.where === 'fill')
  if (!rootFill || normalizeColor(rootFill.css) !== normalizeColor(fill.css)) return roles

  // Only the ink that IS the pair's on-colour is renamed. Everything else the
  // element paints stays: a progress bar's track, a stepper's idle node and
  // the secondary caption beside the solid are real roles too, and replacing
  // the whole list with "fill + first ink" mislabelled a grey caption as
  // `content.on-action`.
  const inkId = SOLID_INK[fill.id]
  const inkKey = inkId && arch[inkId] ? normalizeColor(arch[inkId]) : null
  const inkPaint = inkKey ? paints.find((paint) => paint.where === 'ink' && normalizeColor(paint.css) === inkKey) : undefined
  const out: InspectedRole[] = []
  let inkPlaced = false
  for (const role of roles) {
    if (inkPaint && role.where === 'ink' && normalizeColor(role.css) === inkKey) {
      if (!inkPlaced && !out.some((existing) => existing.id === inkId)) out.push({ id: inkId, css: inkPaint.css, where: 'ink' })
      inkPlaced = true
      continue
    }
    if (out.some((existing) => existing.id === role.id)) continue
    out.push(role)
  }
  if (inkPaint && !inkPlaced && !out.some((existing) => existing.id === inkId)) {
    const at = out.findIndex((role) => role.id === fill.id)
    out.splice(at + 1, 0, { id: inkId, css: inkPaint.css, where: 'ink' })
  }
  return out
}

/**
 * A Button is one fill and one label. Soft / Ghost / Outline / Pressed paint
 * a wash or a `darken()` that is not byte-identical to any role, so
 * `rolesForPaints` keeps the ink and drops the surface — or matches nothing
 * and the badge falls back to Button's whole union (solids of every severity).
 * Once a fill is actually on the element, the badge names that surface and
 * its label, nothing else: no outline, no leftover content roles.
 *
 * The wash still has a role. Translucent brand ink → the ghost ladder
 * (`hover` at ~10 %, `pressed` deeper); opaque `content.accent` → the
 * selected tint Soft is. Solid on-ink → `action.primary.default`
 * unless the pixel already is hover/pressed.
 */
const INK_SURFACE: Record<string, string> = {
  'content.on-action': 'action.primary.default',
  'content.accent': 'surface.selected',
  'content.primary': 'action.secondary.default',
  'status.critical.on-solid': 'status.critical.surface-solid',
  'status.warning.on-solid': 'status.warning.surface-solid',
  'status.success.on-solid': 'status.success.surface-solid',
  'status.info.on-solid': 'status.info.surface-solid',
}

function paintAlpha(css: string): number {
  const key = normalizeColor(css)
  if (!key) return 0
  return Number(key.slice(key.lastIndexOf(',') + 1))
}

function surfaceForInk(
  arch: Record<string, string>,
  inkId: string,
  fillCss: string,
): string | undefined {
  if (inkId === 'content.on-action') {
    const key = normalizeColor(fillCss)
    for (const id of ['action.primary.pressed', 'action.primary.hover', 'action.primary.default'] as const) {
      if (key && normalizeColor(arch[id]) === key) return id
    }
    return 'action.primary.default'
  }
  if (inkId === 'content.accent') {
    const a = paintAlpha(fillCss)
    if (a > 0 && a < 0.99) return a > 0.15 ? 'action.ghost.pressed' : 'action.ghost.hover'
    return 'surface.selected'
  }
  return INK_SURFACE[inkId]
}

function firstArchId(
  arch: Record<string, string>,
  css: string,
  prefer: (id: string) => boolean,
): string | undefined {
  const key = normalizeColor(css)
  if (!key) return
  const candidates = roleIndex(arch).get(key) ?? []
  return candidates.find(prefer) ?? candidates[0]
}

export function pairButtonScopes(
  arch: Record<string, string>,
  roles: InspectedRole[],
  paints: { css: string; where: PaintSlot }[],
): InspectedRole[] {
  const fillPaint = paints.find((paint) => paint.where === 'fill')
  const inkPaint = paints.find((paint) => paint.where === 'ink')
  let fill = roles.find((role) => role.where === 'fill')
  let ink = roles.find((role) => role.where === 'ink')

  if (!ink && inkPaint) {
    const inkId = firstArchId(arch, inkPaint.css, (id) => id.startsWith('content.') || id.endsWith('.content') || id.endsWith('.on-solid'))
    if (inkId) ink = { id: inkId, css: inkPaint.css, where: 'ink' }
  }
  if (fill && !ink && inkPaint) {
    const fillId = fill.id
    const inkId = SOLID_INK[fillId] ?? Object.entries(INK_SURFACE).find(([, surface]) => surface === fillId)?.[0]
    if (inkId && arch[inkId]) ink = { id: inkId, css: inkPaint.css, where: 'ink' }
  }
  if (!fill && fillPaint) {
    const matched = firstArchId(
      arch,
      fillPaint.css,
      (id) => id.startsWith('action.') || id.includes('.surface'),
    )
    const inferred = ink ? surfaceForInk(arch, ink.id, fillPaint.css) : undefined
    const fillId = [matched, inferred, 'surface.selected', 'action.primary.default']
      .find((id): id is string => !!id && !!arch[id])
    if (fillId) fill = { id: fillId, css: fillPaint.css, where: 'fill' }
  }

  const out: InspectedRole[] = []
  if (fill) out.push({ ...fill, where: 'fill' })
  if (ink) out.push({ ...ink, where: 'ink' })
  return out
}

/**
 * A TabMenu is a selected pill and the labels on it. The pill used to be
 * `soft(brandSolid)` — a wash that matched no role — so the badge kept
 * `content.secondary` (inactive tabs) and dropped the selection. Once a
 * fill is on the element, name `surface.selected` and the inks, nothing
 * else: no leftover brand solid from the specimen union.
 */
export function pairTabMenuScopes(
  arch: Record<string, string>,
  roles: InspectedRole[],
  paints: { css: string; where: PaintSlot }[],
): InspectedRole[] {
  const fillPaint = paints.find((paint) => paint.where === 'fill')
  let fill = roles.find((role) => role.where === 'fill' && role.id === 'surface.selected')
    ?? roles.find((role) => role.where === 'fill')
  if (!fill && fillPaint) {
    const matched = firstArchId(
      arch,
      fillPaint.css,
      (id) => id === 'surface.selected' || id.startsWith('action.ghost'),
    )
    const fillId = [matched, 'surface.selected'].find((id): id is string => !!id && !!arch[id])
    if (fillId) fill = { id: fillId, css: fillPaint.css, where: 'fill' }
  }

  const out: InspectedRole[] = []
  if (fill) out.push({ ...fill, where: 'fill' })
  for (const paint of paints) {
    if (paint.where !== 'ink') continue
    const existing = roles.find((role) => role.where === 'ink' && normalizeColor(role.css) === normalizeColor(paint.css))
    const inkId = existing?.id ?? firstArchId(arch, paint.css, (id) => id.startsWith('content.'))
    if (!inkId || out.some((role) => role.id === inkId)) continue
    out.push({ id: inkId, css: paint.css, where: 'ink' })
  }
  return out
}

/** Chrome fills/strokes prefer surface and border roles when several ids
 *  share the hex — a card should name `surface.layer-1`, not whatever
 *  action/content role happens to collide with it. */
function chromeIds(candidates: string[]): string[] {
  const preferred = candidates.filter((id) => id.startsWith('surface.') || id.startsWith('border.'))
  return preferred.length ? preferred : candidates
}

/** A corner, a text run, or the element's own height, already in px. */
export interface GeometrySamples {
  radii: { px: number; circular: boolean }[]
  type: { px: number; weight: number }[]
  height: number | null
}

function lengthPx(value: string | undefined): number | null {
  if (!value) return null
  const n = parseFloat(value)
  return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * Which radius, text and size roles a render is using.
 *
 * Same rule as colour: the catalogue is the allow-list, the pixels on the
 * element decide. `overlay` collapses onto `container` when they share a
 * step; any other pair that lands on one px is named twice, because those
 * are independent axes. A circle is `pill` even when the used radius has
 * been clamped to the box. Caption and helper share a size; the earlier
 * role names that pair too.
 */
export function geometryRoles(t: PreviewTokens, samples: GeometrySamples): InspectedRole[] {
  const out: InspectedRole[] = []
  const seen = new Set<string>()
  const push = (id: string, px: number, kind: InspectKind) => {
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, css: `${px}px`, kind })
  }

  const radii = t.radius
    ? RADIUS_ROLES.flatMap((role) => {
        const px = lengthPx(radiusRoleOf(t, role.key))
        return px == null ? [] : [{ id: `radius.${role.key}`, px, pill: role.key === 'pill' }]
      })
    : []
  // `overlay` is the one role that collapses onto `container` by design.
  // Every other shared pixel is two axes that happen to sit on the same
  // step, and both names belong on the row.
  const containerPx = radii.find((role) => role.id === 'radius.container')?.px
  const seenRadius = new Set<number>()
  for (const sample of samples.radii) {
    if (!(sample.px > 0)) continue
    if (sample.circular) {
      const pill = radii.find((role) => role.pill)
      if (pill) push(pill.id, pill.px, 'radius')
      continue
    }
    if (seenRadius.has(sample.px)) continue
    seenRadius.add(sample.px)
    for (const hit of radii) {
      if (hit.pill || hit.px !== sample.px) continue
      if (hit.id === 'radius.overlay' && hit.px === containerPx) continue
      push(hit.id, hit.px, 'radius')
    }
  }

  const viewport = t.previewViewport ?? 'desktop'
  const primitives = t.typography
  const type = primitives
    ? TYPE_ROLES.flatMap((role) => {
        const css = typeStyleCss(primitives, primitives.roles, role.key, { viewport, leading: false })
        const px = lengthPx(css.size)
        return px == null ? [] : [{ id: `text.${role.key}`, px, weight: css.weight }]
      })
    : []
  const seenType = new Set<string>()
  for (const sample of samples.type) {
    const key = `${sample.px}|${sample.weight}`
    if (seenType.has(key)) continue
    seenType.add(key)
    const hit = type.find((role) => role.px === sample.px && role.weight === sample.weight)
    if (hit) push(hit.id, hit.px, 'text')
  }

  if (samples.height != null && samples.height > 0 && t.sizes) {
    const hit = SIZE_ROLES.flatMap((role) => {
      const px = lengthPx(sizeRoleOf(t, role.key))
      return px == null ? [] : [{ id: `size.${role.key}`, px }]
    }).find((role) => role.px === samples.height)
    if (hit) push(hit.id, hit.px, 'size')
  }

  return out
}

function nestedInspect(node: Element, root: Element): boolean {
  const owner = node.closest('[data-inspect]')
  return !!owner && owner !== root
}

/** Corners, text runs and the outer height of one marker. Descendants that
 *  belong to a nested `[data-inspect]` are left for that marker. */
function readGeometry(root: Element): GeometrySamples {
  const radii: GeometrySamples['radii'] = []
  const type: GeometrySamples['type'] = []
  const seenRadius = new Set<string>()
  const seenType = new Set<string>()
  const nodes = [root, ...Array.from(root.querySelectorAll('*')).slice(0, MAX_NODES)]
  for (const node of nodes) {
    if (node !== root && nestedInspect(node, root)) continue
    const cs = getComputedStyle(node)
    if (cs.display === 'contents') continue
    const radius = Math.round(parseFloat(cs.borderTopLeftRadius))
    if (radius > 0) {
      const w = parseFloat(cs.width)
      const h = parseFloat(cs.height)
      const circular = radius >= 999 || (w > 0 && h > 0 && radius * 2 >= Math.min(w, h) - 1)
      const key = circular ? 'pill' : String(radius)
      if (!seenRadius.has(key)) {
        seenRadius.add(key)
        radii.push({ px: radius, circular })
      }
    }
    if (paintsText(node)) {
      const px = Math.round(parseFloat(cs.fontSize))
      const weight = parseInt(cs.fontWeight, 10)
      if (px > 0 && Number.isFinite(weight)) {
        const key = `${px}|${weight}`
        if (!seenType.has(key)) {
          seenType.add(key)
          type.push({ px, weight })
        }
      }
    }
  }
  return { radii, type, height: outerHeight(root) }
}

function outerHeight(el: Element): number | null {
  // Layout height, not the transformed box. The collage scales modules with
  // `transform`, and `getBoundingClientRect` would report the photograph
  // (a 40px control reading as 17px) instead of the token.
  const layout = (node: Element) => (node as HTMLElement).offsetHeight
  if (getComputedStyle(el).display !== 'contents') {
    const own = layout(el)
    if (own > 1) return own
  }
  let h = 0
  for (const kid of Array.from(el.children)) {
    if (nestedInspect(kid, el)) continue
    h = Math.max(h, layout(kid))
  }
  return h > 1 ? h : null
}

function measureGeometry(t: PreviewTokens, el: Element): InspectedRole[] {
  if (typeof getComputedStyle !== 'function') return []
  return geometryRoles(t, readGeometry(el))
}

function withGeometry(inspection: Inspection, geometry: InspectedRole[]): Inspection {
  if (!geometry.length) return inspection
  const roles = inspection.roles.slice()
  for (const role of geometry) {
    if (roles.some((existing) => existing.id === role.id)) continue
    roles.push(role)
  }
  return { ...inspection, roles }
}

/**
 * The roles ONE rendered element paints, ordered the way it paints them.
 *
 * Falls back to the component's union (`measured: false`) when nothing
 * matched — a flat-architecture system has no `archTokens` at all, and a
 * specimen can legitimately paint only inherited or `transparent` colours.
 * An empty badge would read as "this component uses no colour", which is never
 * what happened.
 */
/** The child the pointer is on, inside a marker — the toast dot, a label
 *  span. The badge still lists the WHOLE component (pointing at a badge's dot
 *  must not hide its wash and its label); this node only decides which of
 *  those rows light up. */
export function inspectHitTarget(marker: Element, hit: Element | null): Element {
  if (!hit || hit === marker || !marker.contains(hit)) return marker
  return hit
}

/** Which of `roles` the node under the pointer actually paints. */
export function paintedRoleIds(roles: InspectedRole[], hit: Element): string[] {
  const keys = new Set(observePaints(hit).map((paint) => paint.key))
  return roles
    .filter((role) => (role.kind ?? 'color') === 'color' && keys.has(normalizeColor(role.css) ?? ''))
    .map((role) => role.id)
}

export function inspectElement(
  t: PreviewTokens, componentKey: string, el: Element,
): Inspection {
  const geometry = measureGeometry(t, el)
  const arch = t.archTokens
  if (!arch) return { roles: geometry, measured: geometry.length > 0 }
  const fromRecipe = recipeInspection(arch, el)
  if (fromRecipe) return withGeometry(fromRecipe, geometry)
  const declared = rolesForComponent(componentKey)
  const paints = observePaints(el)
  const variant = parseInspectVariant(el)
  if (variant) {
    const explicit = resolveVariantRoles(t, componentKey, variant, paints)
    if (explicit?.length) return withGeometry({ roles: explicit, measured: true }, geometry)
  }
  // No component reads `PreviewTokens` colour fields any more: recipes name roles.
  const fieldIndex = fieldRoleIndex(t, [])
  let roles = pairSolidRoles(arch, rolesForPaints(arch, declared, paints, fieldIndex), paints)
  if (componentKey === 'Button') {
    roles = pairButtonScopes(arch, roles, paints)
    // A Button answers with its surface and its label. Falling through to
    // the specimen's UNION would list every severity the axis can paint.
    return withGeometry({ roles, measured: true }, geometry)
  }
  if (componentKey === 'TabMenu') {
    roles = pairTabMenuScopes(arch, roles, paints)
    return withGeometry({ roles, measured: true }, geometry)
  }
  if (roles.length) return withGeometry({ roles, measured: true }, geometry)
  // A gradient fill (the Gradient avatar) is a `gradients` token, not a colour
  // role. Answering with the component's union there listed brand roles the
  // pixel never paints; geometry is the honest whole answer.
  if (paintsGradient(el)) return { roles: geometry, measured: true }
  return withGeometry({ roles: inspectComponent(t, componentKey), measured: false }, geometry)
}

/**
 * A shadcn-skeleton component names itself (`data-escala`) and its axes
 * (`data-color`, `data-style`, `data-size`, `data-force-state`), so the recipe
 * answers exactly which roles paint THIS render — nothing measured, nothing
 * missed, and a state pinned in the playground is the state reported.
 */
function recipeInspection(arch: Record<string, string>, el: Element): Inspection | null {
  const root = el.matches?.('[data-escala]') ? el : el.querySelector('[data-escala]')
  if (!root) return null
  const recipe = COMPONENT_RECIPES[root.getAttribute('data-escala') ?? '']
  if (!recipe) return null
  const axes: Record<string, string> = {}
  for (const part of recipe.parts) {
    for (const axis of part.axes) {
      const v = axis === 'State' ? root.getAttribute('data-force-state') : root.getAttribute(`data-${axis.toLowerCase()}`)
      if (v) axes[axis] = v
    }
  }
  const roles = recipeRolesFor(recipe, axes)
    .map((id) => ({ id, css: arch[id] }))
    .filter((r): r is InspectedRole => !!r.css)
  return roles.length ? { roles, measured: true } : null
}

function paintsGradient(el: Element): boolean {
  if (typeof getComputedStyle !== 'function') return false
  const nodes = [el, ...Array.from(el.querySelectorAll('*')).slice(0, MAX_NODES)]
  return nodes.some((node) => getComputedStyle(node).backgroundImage.includes('gradient('))
}

/**
 * The canvas the artefacts sit on. That fill is `surface.page` by contract
 * (`ThemePreviewHub`'s `pageCanvasColor`), not a measured paint — the scroll
 * container is transparent over the framed section that actually holds the
 * colour, so reading `backgroundColor` here would report nothing.
 */
export function inspectPage(t: PreviewTokens): Inspection {
  const css = t.archTokens?.['surface.page'] ?? t.pageBackground ?? t.surface
  if (!css) return { roles: [], measured: false }
  return {
    roles: [{ id: 'surface.page', css, where: 'fill' }],
    measured: true,
  }
}

/** A group's members and their combined roles. */
export interface GroupInspection {
  roles: InspectedRole[]
  /** Catalogue keys of the inspectable components inside, in DOM order. */
  members: string[]
}

/**
 * Every role painted by the components INSIDE a container — the answer to
 * "what does this whole cluster consume", which is the question you're asking
 * when you point at the box rather than at one control in it.
 *
 * Membership is read from the DOM (`[data-inspect]` descendants), never
 * declared on the container: a module that gains a component gains its roles
 * here with nothing to update, and a label listing components a module no
 * longer holds is impossible to write.
 */
/** One WCAG contrast pair the inspector can verify from resolved roles. */
export interface ContrastCheck {
  id: string
  label: string
  fgId: string
  bgId: string
  ratio: number
  /** WCAG minimum for this pair — 4.5 for text, 3 for UI/non-text. */
  target: number
  pass: boolean
}

export interface TouchTargetCheck {
  px: number
  target: number
  pass: boolean
}

export interface AccessibilityReport {
  contrasts: ContrastCheck[]
  touch?: TouchTargetCheck
}

function compositeOnPage(css: string, pageCss: string): string {
  const a = paintAlpha(css)
  if (a >= 0.995) return css
  if (a <= 0) return pageCss
  try {
    return compositeOver(css, pageCss)
  } catch {
    return pageCss
  }
}

function colorRole(roles: InspectedRole[], id: string): InspectedRole | undefined {
  return roles.find((r) => r.id === id && (r.kind ?? 'color') === 'color')
}

function pushContrast(
  out: ContrastCheck[],
  seen: Set<string>,
  fg: InspectedRole,
  bgCss: string,
  bgId: string,
  target: number,
  label: string,
): void {
  const key = `${fg.id}|${bgId}|${target}`
  if (seen.has(key)) return
  seen.add(key)
  try {
    const ratio = wcagRatio(fg.css, bgCss)
    if (!Number.isFinite(ratio)) return
    out.push({ id: key, label, fgId: fg.id, bgId, ratio, target, pass: ratio >= target })
  } catch {
    /* unparsable colour */
  }
}

/**
 * Contrast pairs implied by the roles on screen — translucent fills are
 * composited over `pageCss` before measuring, matching how the badge is read.
 */
export function accessibilityReport(roles: InspectedRole[], pageCss: string): AccessibilityReport {
  const color = roles.filter((r) => (r.kind ?? 'color') === 'color')
  const contrasts: ContrastCheck[] = []
  const seen = new Set<string>()
  const page = pageCss || '#ffffff'

  for (const sev of ['critical', 'warning', 'success', 'info'] as const) {
    const surface = colorRole(color, `status.${sev}.surface`)
    const content = colorRole(color, `status.${sev}.content`)
    const solid = colorRole(color, `status.${sev}.surface-solid`)
    const onSolid = colorRole(color, `status.${sev}.on-solid`)
    const tintBg = surface ? compositeOnPage(surface.css, page) : null

    if (content && tintBg && surface) {
      pushContrast(contrasts, seen, content, tintBg, surface.id, 4.5, 'Label on tint')
    }
    if (solid && tintBg && surface) {
      pushContrast(contrasts, seen, solid, tintBg, surface.id, 3, 'Dot on tint')
    }
    if (onSolid && solid) {
      pushContrast(contrasts, seen, onSolid, solid.css, solid.id, 4.5, 'Label on solid')
    }
  }

  const primary = colorRole(color, 'action.primary.default')
  const onAction = colorRole(color, 'content.on-action')
  if (primary && onAction) {
    pushContrast(contrasts, seen, onAction, primary.css, primary.id, 4.5, 'Label on fill')
  }

  const inverse = colorRole(color, 'surface.inverse')
  const inverseInk = colorRole(color, 'content.inverse')
  if (inverse && inverseInk) {
    pushContrast(contrasts, seen, inverseInk, inverse.css, inverse.id, 4.5, 'Label on fill')
  }

  // Status dot on an inverse chip (toast) — vivid fill, not ink text.
  if (inverse) {
    for (const sev of ['critical', 'warning', 'success', 'info'] as const) {
      const dot = colorRole(color, `status.${sev}.content`)
      if (!dot || dot.where === 'ink') continue
      if (colorRole(color, `status.${sev}.surface`)) continue
      pushContrast(contrasts, seen, dot, inverse.css, inverse.id, 3, 'Dot on fill')
    }
  }

  if (!contrasts.length) {
    const fill = color.find((r) => r.where === 'fill')
    const ink = color.find((r) => r.where === 'ink')
    if (fill && ink) {
      const bg = compositeOnPage(fill.css, page)
      pushContrast(contrasts, seen, ink, bg, fill.id, 4.5, 'Label on fill')
    }
  }

  const control = roles.find((r) => r.kind === 'size' && (r.id === 'size.control' || r.id === 'size.hit'))
  let touch: TouchTargetCheck | undefined
  if (control) {
    const px = parseFloat(control.css)
    if (Number.isFinite(px)) {
      touch = { px, target: SIZE_CONTROL_MIN_PX, pass: px >= SIZE_CONTROL_MIN_PX }
    }
  }

  return { contrasts, touch }
}

export function inspectGroup(t: PreviewTokens, el: Element): GroupInspection {
  const members: string[] = []
  const roles: InspectedRole[] = []
  const arch = t.archTokens
  if (arch) {
    const index = roleIndex(arch)
    for (const paint of observeChromePaints(el)) {
      const candidates = index.get(paint.key)
      if (!candidates) continue
      for (const id of chromeIds(candidates)) {
        if (roles.some((existing) => existing.id === id)) continue
        roles.push({ id, css: paint.css, where: paint.where })
      }
    }
  }
  for (const child of Array.from(el.querySelectorAll('[data-inspect]'))) {
    const key = child.getAttribute('data-inspect') || ''
    if (!key) continue
    members.push(key)
    // Unmeasured children dump the component's WHOLE union — six variants
    // that aren't on screen. A GradientAvatar with a CSS gradient (no
    // `backgroundColor` to match) would otherwise inject `content.primary`
    // as the accent hex, which is the cyan swatch on a white heading.
    const inspection = inspectElement(t, key, child)
    if (!inspection.measured) continue
    for (const role of inspection.roles) {
      if (roles.some((existing) => existing.id === role.id)) continue
      roles.push(role)
    }
  }
  // The frame itself — a module's own corner, a title that isn't a
  // component. Nested markers were already measured above.
  for (const role of measureGeometry(t, el)) {
    if (roles.some((existing) => existing.id === role.id)) continue
    roles.push(role)
  }
  return { roles, members }
}
