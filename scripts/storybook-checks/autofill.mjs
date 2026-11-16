// Autofill cannot be triggered in headless Chromium, so this checks what the browser PARSED: the stylesheet holds the autofill rules
// for the engine, and they resolve to the field's own fill and ink (no colour of their own).
// Run with Storybook up: node scripts/storybook-checks/autofill.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('autofill')
const browser = await launch()
for (const theme of ['light', 'dark']) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
  await page.goto(story('blocks-auth-signup--playground', `theme:${theme}`)); await sleep(1500)
  const r = await page.evaluate(() => {
    const rules = []
    for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) if (rule.selectorText?.includes('autofill')) rules.push(rule) } catch { /* cross-origin */ } }
    const input = document.querySelector('[data-escala=Input] input')
    const fill = getComputedStyle(input.closest('[data-escala=Input]')).backgroundColor
    const probe = document.createElement('div'); probe.style.background = 'var(--color-surface-input)'; input.closest('[data-escala=Input]').append(probe)
    const surface = getComputedStyle(probe).backgroundColor; probe.remove()
    return { n: rules.length, sel: rules.map((x) => x.selectorText), shadow: rules[0]?.style.boxShadow ?? '', fill, surface }
  })
  check(r.n >= 1, `${theme}: the browser parsed an autofill rule`, r.sel.join(' | '))
  check(r.shadow.includes('inset'), `${theme}: it paints the field fill over the UA background`, r.shadow)
  check(r.fill === r.surface, `${theme}: the field's fill is surface.input`, `${r.fill} vs ${r.surface}`)
}
await browser.close()
done()
