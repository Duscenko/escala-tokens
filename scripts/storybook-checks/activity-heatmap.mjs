// ActivityHeatmap: a real keyboard in a real (headless) Chromium, in Escala Light and Dark. The Browser pane never takes window focus, so
// focus events do not fire there; this check does. It proves the grid's contract (design-plans/activityheatmap-contract.md §4):
// one tab stop, ← → by week, ↑ ↓ by day, Home / End to the week's edges, Ctrl+Home / Ctrl+End to the grid's, the caption (onFocusDay),
// the ring on the keyboard only (2px, 1px off the square), nothing animating on load, and axe.
// Run with Storybook up: node scripts/storybook-checks/activity-heatmap.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { checker, launch, sleep, story } from './lib.mjs'

const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const { check, done } = checker('activity heatmap')
const browser = await launch()
const label = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? null)
const caption = (page) => page.locator('[data-testid=caption]').textContent()

for (const theme of ['light', 'dark']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 700 }, locale: 'en-US' })).newPage()
  await page.goto(story('indicators-activityheatmap--interactive', `theme:${theme}`))
  await sleep(2500)
  const t = (what) => `${what} · ${theme}`

  const stops = await page.evaluate(() => document.querySelectorAll('[role=gridcell][tabindex="0"]').length)
  check(stops === 1, t('one tab stop in the grid'), `${stops}`)
  const gridcells = await page.evaluate(() => document.querySelectorAll('[role=grid] [role=gridcell]').length)
  check(gridcells === 367, t('367 gridcells (52 weeks + 3 days)'), `${gridcells}`)
  const animating = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('[data-escala^="ActivityHeatmap"]')).length)
  check(animating === 0, t('nothing animates on load'), `${animating} running`)

  // The play function already tabbed in and moved; start from a clean load of the same story.
  await page.goto(story('indicators-activityheatmap--playground', `theme:${theme}`))
  await sleep(2000)
  await page.keyboard.press('Tab')
  check((await label(page)) === 'Tuesday, December 30: 0 contributions', t('Tab enters on the end date'), `${await label(page)}`)
  const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth} offset ${cs.outlineOffset}` })
  check(ring === 'solid 2px offset 1px', t('keyboard focus draws the 2px ring 1px off the square'), ring)

  await page.keyboard.press('ArrowLeft')
  check((await label(page))?.startsWith('Tuesday, December 23'), t('← goes one week back'), `${await label(page)}`)
  await page.keyboard.press('ArrowUp')
  check((await label(page))?.startsWith('Monday, December 22'), t('↑ goes one day back'), `${await label(page)}`)
  await page.keyboard.press('Home')
  check((await label(page))?.startsWith('Sunday, December 21'), t('Home goes to Sunday'), `${await label(page)}`)
  await page.keyboard.press('ArrowUp')
  check((await label(page))?.startsWith('Sunday, December 21'), t('↑ stops at Sunday'), `${await label(page)}`)
  await page.keyboard.press('End')
  check((await label(page))?.startsWith('Saturday, December 27'), t('End goes to Saturday'), `${await label(page)}`)
  await page.keyboard.press('ArrowRight')
  check((await label(page))?.startsWith('Tuesday, December 30'), t('→ into the last column lands on a day that exists'), `${await label(page)}`)
  await page.keyboard.press('ArrowDown')
  check((await label(page))?.startsWith('Tuesday, December 30'), t('↓ stops at the last day'), `${await label(page)}`)
  await page.keyboard.press('ArrowRight')
  check((await label(page))?.startsWith('Tuesday, December 30'), t('→ stops at the last week'), `${await label(page)}`)
  await page.keyboard.press('Control+Home')
  check((await label(page))?.startsWith('Sunday, December 29'), t('Ctrl+Home goes to the first day'), `${await label(page)}`)
  await page.keyboard.press('ArrowLeft')
  check((await label(page))?.startsWith('Sunday, December 29'), t('← stops at the first week'), `${await label(page)}`)
  await page.keyboard.press('Control+End')
  check((await label(page))?.startsWith('Tuesday, December 30'), t('Ctrl+End goes to the last day'), `${await label(page)}`)

  // The roving stop followed the focus.
  await page.keyboard.press('ArrowLeft')
  const stop = await page.evaluate(() => document.querySelector('[role=gridcell][tabindex="0"]')?.getAttribute('aria-label'))
  check(stop === (await label(page)), t('the tab stop follows the focused day'), `${stop}`)

  // The caption story: its play function tabbed in and ended on Sunday, December 21 (onFocusDay gave the day); then focus leaves: null.
  await page.goto(story('indicators-activityheatmap--interactive', `theme:${theme}`))
  await sleep(3500)
  check((await caption(page)).startsWith('Sunday, December 21'), t('onFocusDay shows the day in the caption'), await caption(page))
  await page.evaluate(() => document.activeElement?.blur())
  check((await caption(page)).startsWith('Focus a day'), t('onFocusDay(null) when focus leaves'), await caption(page))

  // A click focuses the day (the caption follows) but draws no ring: :focus-visible is for the keyboard.
  await page.locator('[data-week="20"][data-weekday="2"]').click()
  const clicked = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${document.activeElement.getAttribute('aria-label')}` })
  check(clicked.startsWith('none'), t('a click draws no ring'), clicked)
  check((await caption(page)).startsWith('Tuesday, May 20'), t('a click reaches onFocusDay'), await caption(page))

  // axe on the heatmap.
  await page.evaluate(axe)
  const res = await page.evaluate(() => window.axe.run(document.querySelector('#storybook-root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }))
  const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].html.slice(0, 90)}`)
  check(v.length === 0, t('axe: no violations'), v.join(' | '))
}
await browser.close()
done()
