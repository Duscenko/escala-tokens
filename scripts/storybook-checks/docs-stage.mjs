// On a Documentation page the story sits in a block that scrolls sideways when the story is wider. The page paint (the white stage)
// must grow with the story, or the part beyond the block's width shows the dark docs page behind it.
// Run with Storybook up: node scripts/storybook-checks/docs-stage.mjs [docsId …]   (default: every Blocks docs page)
import { BASE, checker, launch, sleep } from './lib.mjs'

const { check, done } = checker('docs stage')
let ids = process.argv.slice(2)
if (!ids.length) {
  const index = await (await fetch(`${BASE}/index.json`)).json()
  ids = Object.values(index.entries).filter((e) => e.type === 'docs' && e.id.startsWith('blocks-')).map((e) => e.id)
}
const browser = await launch()
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
for (const id of ids) {
  await page.goto(`${BASE}/iframe.html?id=${id}&viewMode=docs`)
  await sleep(1800)
  const r = await page.evaluate(() => {
    const out = []
    for (const stage of document.querySelectorAll('.docs-story')) {
      const paint = stage.querySelector('.light, .dark')
      if (!paint) continue
      out.push({ paint: paint.getBoundingClientRect().width, scroll: stage.scrollWidth, left: paint.getBoundingClientRect().left - stage.getBoundingClientRect().left })
    }
    return out
  })
  check(r.length > 0, `${id}: has a story stage`)
  // the block may inset the paint evenly (layout padded): the paint plus its two insets must reach the scroll width
  for (const s of r) check(s.paint + 2 * Math.max(0, s.left) >= s.scroll - 1, `${id}: paint covers the scroll width`, `paint ${s.paint} · scroll ${s.scroll} · left ${s.left}`)
}
await browser.close()
done()
