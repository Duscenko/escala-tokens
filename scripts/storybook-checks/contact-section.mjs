// ContactSection: the media panel is a rounded container, separated from the form by gap-section, and nothing overlaps it.
// Run with Storybook up: node scripts/storybook-checks/contact-section.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('contact section')
const browser = await launch()
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1800 } })).newPage()
await page.goto(story('blocks-marketing-contactsection--layouts')); await sleep(1800)
const r = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-block=ContactSection]')].map((s) => {
    const px = (name) => { const d = document.createElement('div'); d.style.width = `var(${name})`; s.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w }
    const m = s.querySelector('[data-part=media]'), f = s.querySelector('[data-part=form-area]')
    const mr = m.getBoundingClientRect(), fr = f.getBoundingClientRect()
    const mobile = s.dataset.layout === 'mobile'
    return {
      layout: s.dataset.layout, gap: mobile ? fr.top - mr.bottom : fr.left - mr.right, radius: parseFloat(getComputedStyle(m).borderTopLeftRadius),
      want: { gap: px('--spacing-gap-section'), radius: px('--radius-container') }, overlap: !(mr.right <= fr.left + 0.5 || mr.bottom <= fr.top + 0.5),
      h: mr.height, inset: mr.left - s.getBoundingClientRect().left, insetWant: px('--spacing-inset-page'),
    }
  })
})
check(r.length === 2, 'both layouts')
for (const x of r) {
  check(Math.abs(x.gap - x.want.gap) < 1, `${x.layout}: media ↔ form gap = gap-section`, `${x.gap} vs ${x.want.gap}`)
  check(Math.abs(x.radius - x.want.radius) < 1, `${x.layout}: media radius = radius.container`, `${x.radius} vs ${x.want.radius}`)
  check(!x.overlap || x.layout === 'desktop' && x.gap > 0, `${x.layout}: no overlap`)
  check(x.h > 100, `${x.layout}: media has height`, `${x.h}`)
  check(Math.abs(x.inset - x.insetWant) < 1, `${x.layout}: section inset-page`, `${x.inset} vs ${x.insetWant}`)
}
await browser.close()
done()
