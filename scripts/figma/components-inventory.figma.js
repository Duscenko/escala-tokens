// Figma Plugin API script — run it on the Escala Figma file through the Figma MCP
// (`use_figma`) or the plugin console. READ-ONLY: it changes nothing in the file.
//
// It returns the component inventory of every `❖` page: each component set (or
// standalone component) with its variant axes (`Axis: "a|b"`, values in Figma's
// order) and its other properties (`Name:TYPE`, sorted), plus a
// checksum of the JSON so the copy saved to `spec/figma-components.json` can be
// verified byte for byte (`node scripts/figma/save-inventory.mjs --check`).
//
// How to refresh the snapshot: design-plans/figma-components-inventory.md §5.

function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return ('00000000' + h.toString(16)).slice(-8)
}

const pages = []
for (const page of figma.root.children) {
  if (!page.name.startsWith('❖')) continue
  await page.loadAsync()
  const nodes = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
    .filter((n) => !(n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET'))
    .filter((n) => !/^[_.]/.test(n.name) && !n.name.includes(' / '))
  const sets = []
  for (const n of nodes) {
    const defs = n.componentPropertyDefinitions
    const axes = {}
    const props = []
    for (const key of Object.keys(defs).sort()) {
      const d = defs[key]
      if (d.type === 'VARIANT') axes[key] = d.variantOptions.join('|')
      else props.push(key.replace(/#[^#]*$/, '') + ':' + d.type)
    }
    const entry = { name: n.name, variants: n.type === 'COMPONENT_SET' ? n.children.length : 1 }
    if (Object.keys(axes).length) entry.axes = axes
    if (props.length) entry.props = props.sort().join(',')
    sets.push(entry)
  }
  sets.sort((a, b) => (a.name < b.name ? -1 : 1))
  pages.push({ page: page.name.replace(/^❖\s*/, '').replace(/\s*\(✓\)$/, ''), stable: /\(✓\)$/.test(page.name), id: page.id, sets })
}
const json = JSON.stringify(pages)
return { checksum: fnv1a(json), pages: pages.length, sets: pages.reduce((s, p) => s + p.sets.length, 0), json }
