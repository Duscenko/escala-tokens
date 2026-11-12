// READ-ONLY Figma Plugin API script — run with the Figma MCP `use_figma`.
// Never mutates the file (the Figma file is never edited: SKILL.md rule 2).
//
// Replace __SET_ID__ with the component set's node id (from the Dev link,
// `node-id=4-5066` → '4:5066'; a link to one variant also works — its parent
// set is used). Returns one JSON inventory:
//   set        name, description, variant count
//   props      every property in Figma's PANEL order (variant axes first),
//              with type, default and options
//   sweep      the default variant + every variant that differs from it on ONE
//              axis: geometry, layout, fills / strokes / effects and children,
//              every value with the variable it is bound to
//   colours    every variant in one line: fill · stroke · ink · ring variables
//
// Paste the whole file as the `code` of a use_figma call. ~15–40 KB of output
// for a 288-variant set; set SWEEP_DEPTH lower if it is too long.

const SET_ID = '__SET_ID__'
const SWEEP_DEPTH = 4 // child levels described in the sweep

let node = await figma.getNodeByIdAsync(SET_ID)
if (!node) throw new Error(`No node ${SET_ID}`)
if (node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET') node = node.parent
let page = node
while (page && page.type !== 'PAGE') page = page.parent
await figma.setCurrentPageAsync(page)
const set = node
if (set.type !== 'COMPONENT_SET' && set.type !== 'COMPONENT') throw new Error(`${SET_ID} is a ${set.type}, not a component set`)

// ── Variables, cached ────────────────────────────────────────────────────────
const varCache = new Map()
async function vname(alias) {
  if (!alias || !alias.id) return null
  if (!varCache.has(alias.id)) {
    const v = await figma.variables.getVariableByIdAsync(alias.id)
    varCache.set(alias.id, v ? v.name : `?${alias.id}`)
  }
  return varCache.get(alias.id)
}
const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
async function paints(list, bound) {
  if (!Array.isArray(list) || !list.length) return []
  const out = []
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    if (p.visible === false) continue
    const v = p.boundVariables?.color ? await vname(p.boundVariables.color) : (bound?.[i] ? await vname(bound[i]) : null)
    out.push(v ?? (p.type === 'SOLID' ? hex(p.color) + (p.opacity != null && p.opacity < 1 ? ` @${+p.opacity.toFixed(2)}` : '') : p.type))
  }
  return out
}
async function num(n, key) {
  const b = n.boundVariables?.[key]
  const v = b ? await vname(b) : null
  const raw = n[key]
  if (raw === undefined || raw === figma.mixed) return v
  return v ? `${v} (${+(+raw).toFixed(2)})` : +(+raw).toFixed(2)
}
async function effects(n) {
  if (!n.effects?.length) return undefined
  const out = []
  for (const e of n.effects) {
    if (e.visible === false) continue
    const col = e.boundVariables?.color ? await vname(e.boundVariables.color) : (e.color ? hex(e.color) + ` @${+(e.color.a ?? 1).toFixed(2)}` : '')
    out.push(`${e.type} ${e.offset ? `${e.offset.x} ${e.offset.y} ` : ''}${e.radius ?? ''} ${e.spread ?? ''} ${col}`.replace(/\s+/g, ' ').trim())
  }
  if (n.effectStyleId) {
    const s = await figma.getStyleByIdAsync(n.effectStyleId)
    if (s) out.push(`style ${s.name}`)
  }
  return out.length ? out : undefined
}

// ── One node, described ──────────────────────────────────────────────────────
async function describe(n, depth) {
  const d = { name: n.name, type: n.type, size: `${Math.round(n.width)}×${Math.round(n.height)}` }
  if (n.visible === false) d.hidden = true
  if ('layoutMode' in n && n.layoutMode && n.layoutMode !== 'NONE') {
    d.layout = `${n.layoutMode} ${n.primaryAxisAlignItems}/${n.counterAxisAlignItems}`
    d.gap = await num(n, 'itemSpacing')
    const pad = [await num(n, 'paddingTop'), await num(n, 'paddingRight'), await num(n, 'paddingBottom'), await num(n, 'paddingLeft')]
    if (pad.some((p) => p && p !== 0)) d.padding = pad
  }
  if ('layoutPositioning' in n && n.layoutPositioning === 'ABSOLUTE') d.absolute = `x ${Math.round(n.x)} y ${Math.round(n.y)}`
  if ('width' in n && n.boundVariables?.width) d.width = await num(n, 'width')
  if ('height' in n && n.boundVariables?.height) d.height = await num(n, 'height')
  if ('cornerRadius' in n) {
    const r = n.boundVariables?.topLeftRadius ? await num(n, 'topLeftRadius') : n.cornerRadius
    if (r && r !== 0 && r !== figma.mixed) d.radius = r
  }
  if ('fills' in n) { const f = await paints(n.fills, n.boundVariables?.fills); if (f.length) d.fill = f }
  if ('strokes' in n) {
    const s = await paints(n.strokes, n.boundVariables?.strokes)
    if (s.length) {
      d.stroke = s
      d.strokeWeight = n.boundVariables?.strokeWeight ? await num(n, 'strokeWeight') : (n.boundVariables?.strokeTopWeight ? await num(n, 'strokeTopWeight') : n.strokeWeight)
      d.strokeAlign = n.strokeAlign
    }
  }
  const fx = await effects(n)
  if (fx) d.effects = fx
  if ('opacity' in n && n.opacity < 1) d.opacity = +n.opacity.toFixed(2)
  if (n.type === 'TEXT') {
    d.text = n.characters.slice(0, 60)
    if (n.textStyleId && n.textStyleId !== figma.mixed) d.textStyle = (await figma.getStyleByIdAsync(n.textStyleId))?.name
    const fs = n.boundVariables?.fontSize
    if (fs) d.fontSize = await vname(Array.isArray(fs) ? fs[0] : fs)
  }
  if (n.type === 'INSTANCE') {
    const mc = await n.getMainComponentAsync()
    d.instanceOf = mc ? (mc.parent?.type === 'COMPONENT_SET' ? `${mc.parent.name} / ${mc.name}` : mc.name) : null
  }
  if (depth > 0 && 'children' in n && n.type !== 'INSTANCE') {
    d.children = []
    for (const c of n.children) d.children.push(await describe(c, depth - 1))
  } else if (n.type === 'INSTANCE' && 'children' in n && depth > 0) {
    // An icon or nested component: its first painted vector tells the ink.
    const ink = n.findOne((c) => 'fills' in c && Array.isArray(c.fills) && c.fills.length && c.type !== 'FRAME')
    if (ink) d.ink = (await paints(ink.fills, ink.boundVariables?.fills))[0]
  }
  return d
}

// ── Properties in Figma's panel order ────────────────────────────────────────
const defs = Object.entries(set.componentPropertyDefinitions ?? {}).map(([key, def]) => ({
  name: key.split('#')[0],
  key,
  type: def.type,
  default: def.defaultValue,
  options: def.variantOptions,
}))
const panel = [...defs.filter((d) => d.type === 'VARIANT'), ...defs.filter((d) => d.type !== 'VARIANT')]
for (const p of panel) {
  if (p.type === 'INSTANCE_SWAP' && typeof p.default === 'string') {
    const c = await figma.getNodeByIdAsync(p.default)
    if (c) p.defaultName = c.parent?.type === 'COMPONENT_SET' ? c.parent.name : c.name
  }
}

// ── Variants: the default and the one-axis sweep ─────────────────────────────
const axes = panel.filter((p) => p.type === 'VARIANT')
const defaults = Object.fromEntries(axes.map((a) => [a.name, a.default]))
const variants = set.type === 'COMPONENT_SET' ? set.children.filter((c) => c.type === 'COMPONENT') : [set]
const offAxes = (v) => axes.filter((a) => (v.variantProperties?.[a.name] ?? defaults[a.name]) !== defaults[a.name]).map((a) => a.name)
const sweep = []
for (const v of variants) {
  const off = offAxes(v)
  if (off.length > 1) continue
  sweep.push({ variant: v.name, differs: off[0] ?? 'default', ...(await describe(v, SWEEP_DEPTH)) })
}

// ── Every variant's colour roles, one line each ──────────────────────────────
const colours = {}
for (const v of variants) {
  const fill = (await paints(v.fills, v.boundVariables?.fills))[0] ?? '—'
  const stroke = (await paints(v.strokes, v.boundVariables?.strokes))[0] ?? '—'
  // Ink: the first text, else the first painted vector (an icon-only control).
  const text = v.findOne((c) => c.type === 'TEXT' && c.visible !== false)
    ?? v.findOne((c) => ['VECTOR', 'BOOLEAN_OPERATION', 'ELLIPSE', 'STAR', 'POLYGON'].includes(c.type) && Array.isArray(c.fills) && c.fills.length > 0)
  const ink = text ? ((await paints(text.fills, text.boundVariables?.fills))[0] ?? '—') : '—'
  const ringNode = v.findOne((c) => /focus|ring/i.test(c.name) && c.type !== 'TEXT')
  const ring = ringNode ? ((await paints(ringNode.strokes, ringNode.boundVariables?.strokes))[0] ?? (await paints(ringNode.fills, ringNode.boundVariables?.fills))[0]) : null
  const fx = await effects(v)
  colours[v.name] = `fill ${fill} · stroke ${stroke} · ink ${ink}${ring ? ` · ring ${ring}` : ''}${fx ? ` · fx ${fx.join(' + ')}` : ''}`
}

return {
  set: { id: set.id, name: set.name, page: page.name, description: set.description, variants: variants.length },
  props: panel.map(({ key, ...p }) => p),
  defaults,
  sweep,
  colours,
}
