// Figma Plugin API script (Figma MCP `use_figma`). MUTATES the file.
// Rebuilds the "DocMatrix · <Set>" label grid of a Button-family page for the
// Variant × Appearance grammar (6 blocks of two combinations), orders the set's
// variants so the property panel lists solid · outline · ghost · link, and grows the
// section to fit. Run after button-variant-appearance.figma.js.

const PAGE_ID = '4:2185', SECTION_ID = '834:1852', SET_ID = '4:5066', NAME = 'Button'

const BLOCKS = [
  ['default', ['solid', 'outline']],
  ['default', ['ghost', 'link']],
  ['secondary', ['solid', 'outline']],
  ['secondary', ['ghost', 'link']],
  ['critical', ['solid', 'outline']],
  ['critical', ['ghost', 'link']],
]
const SIZES = ['default', 'xs', 'sm', 'lg']
const STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']
const APPEARANCES = ['solid', 'outline', 'ghost', 'link']
const VARIANTS = ['default', 'secondary', 'critical']

const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const section = await figma.getNodeByIdAsync(SECTION_ID)
const set = await figma.getNodeByIdAsync(SET_ID)
const dm = section.children.find((n) => n.name === `DocMatrix · ${NAME}`)
const oldGroups = dm.children.slice()
const template = oldGroups.find((g) => g.width > 1000) // a two-combination group

async function setText(node, value) {
  for (const seg of node.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName)
  node.characters = value
}
const created = []
for (const [variant, pair] of BLOCKS) {
  const g = template.clone()
  dm.appendChild(g)
  g.name = `group · Variant = ${variant} · Appearance = ${pair.join(' · ')}`
  const [header, , rowVariants, ...stateRows] = g.children
  await setText(header.findAll((n) => n.type === 'TEXT')[0], `Variant = ${variant} · Appearance = ${pair.join(' · ')}`)
  const vCells = rowVariants.children
  for (let i = 1; i < vCells.length; i++) await setText(vCells[i].findAll((n) => n.type === 'TEXT')[0], pair[(i - 1) % 2])
  for (const row of stateRows) {
    row.children.slice(1).forEach((cell, i) => { cell.name = `cell · ${SIZES[Math.floor(i / 2)]} · ${pair[i % 2]}` })
  }
  created.push(g.id)
}
const removed = oldGroups.map((g) => g.id)
for (const g of oldGroups) g.remove()

// Panel order: Variant, Appearance, Size, State in the order above.
const rank = (c) => {
  const p = c.variantProperties
  return ((VARIANTS.indexOf(p.Variant) * 4 + APPEARANCES.indexOf(p.Appearance)) * 4 + SIZES.indexOf(p.Size)) * 6 + STATES.indexOf(p.State)
}
const ordered = set.children.slice().sort((a, b) => rank(a) - rank(b))
ordered.forEach((c, i) => set.insertChild(i, c))

// Grow the section and its background card to fit the taller grid.
const h = Math.round(set.y + set.height + 64)
const bg = section.children.find((n) => n.type === 'INSTANCE' && n.name.endsWith('/ Components'))
if (bg) bg.resize(bg.width, h)
section.resizeWithoutConstraints(section.width, h)

const axes = Object.fromEntries(Object.entries(set.componentPropertyDefinitions).filter(([, d]) => d.type === 'VARIANT').map(([k, d]) => [k, d.variantOptions]))
return { createdGroups: created, removedGroups: removed, dm: [dm.width, dm.height], set: [set.width, set.height], section: [section.width, section.height], axes }
