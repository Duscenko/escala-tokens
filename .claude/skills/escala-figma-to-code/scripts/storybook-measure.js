// Run in the Storybook manager tab with the Browser pane's `javascript_tool`
// (or paste in DevTools). Measures every Escala component rendered in the
// current story and returns one row per element: the numbers to compare with
// `figma-read-set.js` — size, fill, ink, border, radius, padding, gap, shadow,
// outline, and where each child sits inside the box.
//
// Usage: open the story (Playground, States…), wait for it to render, run.
// Set SELECTOR to narrow it (default: every recipe root in the story).

const SELECTOR = '#storybook-root [data-escala]'

await new Promise((r) => setTimeout(r, 1500))
const frame = document.querySelector('iframe#storybook-preview-iframe')
const doc = frame ? frame.contentDocument : document
const win = doc.defaultView
const hex = (c) => {
  const m = c.match(/[\d.]+/g)
  if (!m || c === 'transparent') return c
  const [r, g, b, a] = m.map(Number)
  const h = '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  return m.length === 4 && a < 1 ? `${h} @${a}` : h
}
const colours = (s) => s.replace(/rgba?\([^)]*\)/g, (m) => hex(m))
const box = (el) => el.getBoundingClientRect()
function rectOf(node) {
  if (node.nodeType === 3) { const r = doc.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect() }
  return node.getBoundingClientRect()
}
const rows = [...doc.querySelectorAll(SELECTOR)]
  // A recipe root inside another (a Button inside a Card) is measured on its own.
  .map((el) => {
    const cs = win.getComputedStyle(el)
    const b = box(el)
    const attrs = Object.fromEntries([...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-escala').map((a) => [a.name.slice(5), a.value]))
    const children = [...el.childNodes]
      .filter((n) => (n.nodeType === 3 && n.textContent.trim()) || n.nodeType === 1)
      .map((n) => {
        const r = rectOf(n)
        return {
          node: n.nodeType === 3 ? `"${n.textContent.trim().slice(0, 20)}"` : (n.getAttribute('data-part') || n.getAttribute('data-slot') || n.tagName.toLowerCase()),
          x: +(r.left - b.left).toFixed(1), y: +(r.top - b.top).toFixed(1),
          w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          below: +(b.bottom - r.bottom).toFixed(1),
        }
      })
    return {
      component: el.getAttribute('data-escala'),
      ...attrs,
      text: el.textContent.trim().slice(0, 24),
      size: `${+b.width.toFixed(1)}×${+b.height.toFixed(1)}`,
      fill: hex(cs.backgroundColor),
      ink: hex(cs.color),
      border: `${cs.borderTopWidth} ${hex(cs.borderTopColor)}`,
      radius: cs.borderTopLeftRadius,
      padding: cs.padding,
      gap: cs.gap,
      display: cs.display,
      font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`,
      shadow: colours(cs.boxShadow),
      outline: cs.outlineStyle === 'none' ? 'none' : `${cs.outlineWidth} ${hex(cs.outlineColor)} offset ${cs.outlineOffset}`,
      children,
    }
  })
rows
