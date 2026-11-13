// Figma Plugin API script (run with the Figma MCP `use_figma`). MUTATES the file.
// Reshapes a Button-family set from one mixed `Variant` axis to the file grammar:
// `Variant` (intent: default · secondary · critical) × `Appearance`
// (solid · outline · ghost · link), and fills the 12-combination matrix by cloning
// the nearest existing variant and re-pointing only its colour variables.
// Decision + role table: design-plans/button-figma-parity.md.
//
// Set SET_ID before running. Idempotent: a set already on the new grammar is left alone.
// The Plugin API cannot save a named version (`saveVersionHistoryAsync` is unsupported
// through the MCP): rely on Figma's own history, or save one by hand first.

const SET_ID = '4:5066' // Button. IconButton: '614:785'

// Old single-axis value → new pair.
const RENAME = {
  default: ['default', 'solid'],
  secondary: ['secondary', 'solid'],
  outline: ['secondary', 'outline'],
  ghost: ['secondary', 'ghost'],
  link: ['default', 'link'],
  destructive: ['critical', 'solid'],
  'destructive-outline': ['critical', 'outline'],
}

// New combinations: template (old value) + colour variable remap. The Disabled state
// keeps its neutral disabled roles (its stroke and root fill are not remapped).
const NEW = [
  { v: 'default', a: 'outline', from: 'outline', map: { 'Border/control': 'Border/accent', 'Content/primary': 'Content/accent' } },
  { v: 'default', a: 'ghost', from: 'ghost', map: { 'Content/primary': 'Content/accent' } },
  { v: 'secondary', a: 'link', from: 'link', map: { 'Content/link/default': 'Content/secondary', 'Content/link/hover': 'Content/primary' } },
  { v: 'critical', a: 'outline', from: 'outline', map: { 'Border/control': 'Status/critical/border-strong', 'Content/primary': 'Status/critical/content' } },
  { v: 'critical', a: 'ghost', from: 'ghost', map: { 'Content/primary': 'Status/critical/content' } },
  { v: 'critical', a: 'link', from: 'link', map: { 'Content/link/default': 'Status/critical/content', 'Content/link/hover': 'Status/critical/content' }, underlineOn: ['Hover', 'Pressed'] },
]

// Layout: 6 blocks of two combinations, as the DocMatrix draws them.
const BLOCKS = [
  [['default', 'solid'], ['default', 'outline']],
  [['default', 'ghost'], ['default', 'link']],
  [['secondary', 'solid'], ['secondary', 'outline']],
  [['secondary', 'ghost'], ['secondary', 'link']],
  [['critical', 'solid'], ['critical', 'outline']],
  [['critical', 'ghost'], ['critical', 'link']],
]
const SIZES = ['default', 'xs', 'sm', 'lg']
const STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']
const CELL_W = 168, CELL_H = 80, LABEL_W = 192, BLOCK_STEP = 649, ROWS_TOP = 145

const set = await figma.getNodeByIdAsync(SET_ID)
let page = set
while (page.type !== 'PAGE') page = page.parent
await figma.setCurrentPageAsync(page)
if ('Appearance' in set.componentPropertyDefinitions) return { skipped: 'already on Variant × Appearance', setId: SET_ID }

// Variables by name, Color Semantics only.
const cols = await figma.variables.getLocalVariableCollectionsAsync()
const sem = cols.find((c) => c.name === 'Color Semantics')
const byName = {}
for (const id of sem.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); byName[v.name] = v }
const nameOf = {}
for (const v of Object.values(byName)) nameOf[v.id] = v.name

function remapPaints(paints, map, skip) {
  if (!Array.isArray(paints)) return null
  let changed = false
  const out = paints.map((p) => {
    const b = p.boundVariables && p.boundVariables.color
    const to = b && map[nameOf[b.id]]
    if (!to || skip) return p
    changed = true
    return figma.variables.setBoundVariableForPaint(p, 'color', byName[to])
  })
  return changed ? out : null
}
async function remapNode(root, map, state, underline) {
  const nodes = [root, ...root.findAll(() => true)]
  for (const n of nodes) {
    const skipStroke = state === 'Disabled'
    if ('fills' in n && n.fills !== figma.mixed) { const f = remapPaints(n.fills, map, state === 'Disabled' && n === root); if (f) n.fills = f }
    if ('strokes' in n) { const s = remapPaints(n.strokes, map, skipStroke); if (s) n.strokes = s }
    if (underline && n.type === 'TEXT') {
      for (const seg of n.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName)
      n.textDecoration = 'UNDERLINE'
    }
  }
}

const created = []
const old = set.children.slice()
const byOld = {}
for (const c of old) {
  const p = c.variantProperties
  ;(byOld[p.Variant] = byOld[p.Variant] || []).push(c)
}
// 1. Clone the new combinations from their templates — only the pairs the set lacks
// (Button already has critical · outline as `destructive-outline`).
const have = new Set(Object.keys(byOld).map((o) => RENAME[o].join('·')))
for (const spec of NEW) {
  if (have.has(spec.v + '·' + spec.a)) continue
  for (const t of byOld[spec.from] || []) {
    const p = t.variantProperties
    const c = t.clone()
    set.appendChild(c) // clone() of a variant lands on the page, not in the set
    await remapNode(c, spec.map, p.State, spec.underlineOn && spec.underlineOn.includes(p.State))
    c.name = `Variant=${spec.v}, Appearance=${spec.a}, Size=${p.Size}, State=${p.State}`
    created.push(c.id)
  }
}
// 2. Rename the existing ones.
for (const c of old) {
  const p = c.variantProperties
  const [v, a] = RENAME[p.Variant]
  c.name = `Variant=${v}, Appearance=${a}, Size=${p.Size}, State=${p.State}`
}
// 3. Lay out in the DocMatrix grid.
const missing = []
for (const c of set.children) {
  const p = c.variantProperties
  const bi = BLOCKS.findIndex((b) => b.some(([v, a]) => v === p.Variant && a === p.Appearance))
  const k = SIZES.indexOf(p.Size), r = STATES.indexOf(p.State)
  if (bi < 0 || k < 0 || r < 0) { missing.push(c.name); continue }
  const slot = BLOCKS[bi].findIndex(([v, a]) => v === p.Variant && a === p.Appearance)
  const cellX = 1 + LABEL_W + (k * 2 + slot) * CELL_W
  const cellY = bi * BLOCK_STEP + ROWS_TOP + r * CELL_H
  c.x = Math.round(cellX + (CELL_W - c.width) / 2)
  c.y = Math.round(cellY + (CELL_H - c.height) / 2)
}
set.resizeWithoutConstraints(set.width, BLOCKS.length * BLOCK_STEP - 24)
return { setId: SET_ID, variants: set.children.length, created: created.length, createdIds: created, missing, size: [set.width, set.height], axes: Object.fromEntries(Object.entries(set.componentPropertyDefinitions).filter(([, d]) => d.type === 'VARIANT').map(([k, d]) => [k, d.variantOptions])) }
