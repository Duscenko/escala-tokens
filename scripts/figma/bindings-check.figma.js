// Figma Plugin API script — READ-ONLY. Run it on the Escala library (7j5zukN5HpihGVJMmyjA20)
// through the Figma MCP (`use_figma`). Never run by hand: `npm run figma:bindings:prepare` writes
// it with `const EXPECT = …` prepended (built from `bindings` in spec/contracts/<Key>.json).
//
// For every variant of every component set in EXPECT it resolves, per part and per slot
// (fill · stroke · text), the role the contract binds at that variant's axis values and reads
// what the Figma layer binds. It returns only the differences, grouped per component, as tuples
// [key, kind, part, slot, want, got, variants, sampleVariantId] (`use_figma` returns at most
// 48 000 bytes), plus what it could not check and why. Governance §4.5.2. `npm run figma:bindings:report` turns it into findings.
//
// EXPECT = { names: string[], parts: [part, f, s, t][], sets: [{ key, id, rules: [{ a: string[], v: { combo: partIndex[] } }] }] }
// f · s · t are indexes into `names` (a Figma variable name), -1 for `none`, null when unbound by the contract.

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const vcache = {}
async function vname(id) {
  if (!(id in vcache)) {
    const v = await figma.variables.getVariableByIdAsync(id)
    vcache[id] = v ? v.name : `?${id}`
  }
  return vcache[id]
}
// What a paint list binds: 'none' · '<Variable/name>' · 'unbound', plus an opacity only when the
// paint's opacity differs from the variable's own resolved alpha (Figma mirrors that alpha into
// `paint.opacity` when a translucent role is bound, which is not an opacity on the role).
// `stack`: a fill reads every visible paint bottom to top, joined ' + ' (a state drawn as a
// translucent fill over the rest fill is a stack in the contract too: `overlay`, `overlay2`).
async function readOne(p, consumer) {
  // A gradient binds its stops: read them in order, joined ' → ' (the contract's fill → fillMid → fillEnd).
  if (Array.isArray(p.gradientStops) && p.gradientStops.length) {
    const stops = []
    for (const g of [...p.gradientStops].sort((x, y) => x.position - y.position)) {
      const sb = g.boundVariables && g.boundVariables.color
      stops.push(sb ? await vname(sb.id) : 'unbound')
    }
    return { got: stops.join(' → '), opacity: null }
  }
  const b = p.boundVariables && p.boundVariables.color
  if (!b) return { got: p.type === 'SOLID' ? 'unbound' : p.type.toLowerCase() }
  const op = p.opacity ?? 1
  if (op > 0.999) return { got: await vname(b.id), opacity: null }
  const v = await figma.variables.getVariableByIdAsync(b.id)
  const r = v ? v.resolveForConsumer(consumer) : null
  const alpha = r && r.value && typeof r.value === 'object' && 'a' in r.value ? r.value.a : 1
  return { got: await vname(b.id), opacity: Math.abs(alpha - op) < 0.011 ? null : Math.round(op * 100) / 100 }
}
async function readPaints(list, consumer, stack) {
  if (!Array.isArray(list)) return { got: 'none' }
  const vis = list.filter((p) => p.visible !== false && (p.opacity ?? 1) > 0)
  if (!vis.length) return { got: 'none' }
  const top = await readOne(vis[vis.length - 1], consumer)
  if (!stack || vis.length === 1) return top
  const all = []
  for (const p of vis) all.push((await readOne(p, consumer)).got)
  return { got: all.join(' + '), opacity: top.opacity }
}
function variantProps(name) {
  const out = {}
  for (const kv of name.split(',')) { const [k, v] = kv.split('=').map((x) => x && x.trim()); if (k && v !== undefined) out[k] = v }
  return out
}
// Layers of a variant by normalised name (not inside nested instances, except the instance itself).
function layersOf(variant) {
  const map = {}
  const walk = (n, inInstance) => {
    for (const ch of n.children || []) {
      const key = norm(ch.name)
      if (!(key in map)) map[key] = ch
      if (ch.type !== 'INSTANCE' && !inInstance) walk(ch, false)
    }
  }
  walk(variant, false)
  return map
}
function firstText(n) {
  for (const ch of n.children || []) {
    if (ch.visible === false) continue
    if (ch.type === 'TEXT') return ch
    if (ch.type !== 'INSTANCE') { const t = firstText(ch); if (t) return t }
  }
  return null
}
function firstPainted(n) {
  if (n.type === 'TEXT' || n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION' || n.type === 'ELLIPSE' || n.type === 'RECTANGLE') return n
  // A field's text caret (a RECTANGLE named `caret`, Focused fields) is a mark beside the text, not the text's colour.
  for (const ch of n.children || []) { if (ch.visible === false || (ch.type === 'RECTANGLE' && norm(ch.name) === 'caret')) continue; const t = firstPainted(ch); if (t) return t }
  return null
}

const result = { checked: {}, notChecked: [], diffs: [] }
for (const set of EXPECT.sets) {
  const node = await figma.getNodeByIdAsync(set.id)
  if (!node || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT')) { result.notChecked.push({ key: set.key, why: `node ${set.id} not found` }); continue }
  const variants = node.type === 'COMPONENT_SET' ? node.children : [node]
  const groups = {}
  let compared = 0
  const skipped = {}
  for (const variant of variants) {
    const props = node.type === 'COMPONENT_SET' ? variantProps(variant.name) : {}
    // A variant with an axis value the contract does not know (not built in code yet): not compared.
    const unknown = Object.entries(set.ax || {}).find(([ax, vals]) => ax in props && !vals.includes(props[ax]))
    if (unknown) { skipped[`${unknown[0]}=${props[unknown[0]]} not in the contract`] = 1; continue }
    // Merge every rule that applies to this variant, general → specific (contract order).
    const want = {}
    for (const r of set.rules) {
      if (!r.a.every((ax) => ax in props)) { for (const ax of r.a) if (!(ax in props)) skipped[`axis ${ax} not in Figma`] = 1; continue }
      const hit = r.v[r.a.map((ax) => props[ax]).join('|')]
      if (!hit) continue
      for (const pi of hit) {
        const [part, f, s, t] = EXPECT.parts[pi]
        const slots = (want[part] = want[part] || {})
        if (f !== null) slots.f = f
        if (s !== null) slots.s = s
        if (t !== null) slots.t = t
      }
    }
    // Value=placeholder: Figma's value text layer shows the placeholder, which the code paints through its `placeholder` part.
    if (props.Value === 'placeholder' && want.text && want.placeholder && want.placeholder.t != null && want.text.t != null) want.text.t = want.placeholder.t
    const layers = layersOf(variant)
    const claimedText = new Set()
    // A part's text target is claimed, so the root's text never reads it.
    for (const [part, slots] of Object.entries(want)) {
      const l = part !== 'root' && 't' in slots ? layers[norm(part)] : null
      if (l) { claimedText.add(l); const t = l.type === 'TEXT' ? l : firstPainted(l); if (t) claimedText.add(t) }
    }
    for (const [part, slots] of Object.entries(want)) {
      const layer = part === 'root' ? variant : layers[norm(part)]
      if (!layer) { skipped[`no layer named ${part}`] = 1; continue }
      for (const [slot, idx] of Object.entries(slots)) {
        let target = layer
        let key = slot === 'f' ? 'fills' : slot === 's' ? 'strokes' : 'fills'
        if (slot === 't') {
          target = part === 'root' ? (layers.label && !claimedText.has(layers.label) ? layers.label : firstText(variant)) : (layer.type === 'TEXT' ? layer : firstPainted(layer))
          if (target && claimedText.has(target) && part === 'root') target = null
          if (!target) { skipped[`no text layer for ${part}.text`] = 1; continue }
        }
        const visible = (list) => Array.isArray(list) && list.some((pt) => pt.visible !== false)
        // A text colour on a vector (an SVG line, a chevron) paints its stroke.
        if (slot === 't' && target.type !== 'TEXT' && !visible(target.fills) && visible(target.strokes)) key = 'strokes'
        // A part drawn by one nested instance (e.g. a Separator): the paint is that component's, not this one's.
        if (slot !== 't' && target.type === 'FRAME' && !visible(target[key]) && target.children.length === 1 && target.children[0].type === 'INSTANCE') { skipped[`${part} drawn by a nested instance`] = 1; continue }
        let read = await readPaints(target[key], target, slot === 'f')
        const w = idx < 0 ? 'none' : EXPECT.names[idx]
        // A text colour on a vector with both a fill and a stroke (an arrow: fill + edge) may paint either.
        if (slot === 't' && target.type !== 'TEXT' && read.got !== w && visible(target.fills) && visible(target.strokes)) {
          const other = await readPaints(target.strokes, target)
          if (other.got === w) read = other
        }
        compared++
        const issues = []
        if (read.got !== w) issues.push(['role', read.got])
        else if (read.opacity != null) issues.push(['opacity', `${read.got} @ ${read.opacity}`])
        for (const [kind, got] of issues) {
          const g = `${kind}|${part}|${slot}|${w}|${got}`
          const e = (groups[g] = groups[g] || [set.key, kind === 'role' ? 'r' : 'o', part, slot, w, got, 0, variant.id])
          e[6]++
        }
      }
    }
  }
  result.checked[set.key] = [variants.length, compared, ...Object.keys(skipped).slice(0, 4)]
  for (const g of Object.values(groups)) result.diffs.push(g)
}
return result
