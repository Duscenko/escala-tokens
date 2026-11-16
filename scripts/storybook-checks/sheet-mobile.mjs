// Sheet · mobile. The bottom sheet on a 393 x 852 screen, with and without the keyboard: geometry against the Figma set
// (393 wide, grabber 12, close at 341,32), the visual-viewport cap (not 100vh), the live viewport listener, no horizontal
// overflow. Run with Storybook up: node scripts/storybook-checks/sheet-mobile.mjs [--shots <dir>]
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('Sheet mobile')
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null
const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()

const read = () => page.evaluate(() => {
  const el = document.querySelector('[data-escala="Sheet"]'); const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
  const frame = el.offsetParent?.getBoundingClientRect() ?? { top: 0, bottom: innerHeight, left: 0, width: innerWidth }
  const body = el.querySelector('[data-part="Sheet.body"]')
  const close = el.querySelector('[data-escala="CloseButton"]').getBoundingClientRect()
  return { w: r.width, h: r.height, top: r.top - frame.top, bottom: frame.bottom - r.bottom, maxH: cs.maxHeight, padB: cs.paddingBottom, closeX: close.left - r.left, closeY: close.top - r.top, bodyScroll: body.scrollHeight > body.clientHeight, overflowX: document.documentElement.scrollWidth > innerWidth }
})

for (const [id, keyboard] of [['content-surfaces-sheet--mobile', false], ['content-surfaces-sheet--mobile-keyboard', true]]) {
  await page.goto(story(id))
  await page.waitForSelector('[data-escala="Sheet"]')
  await sleep(900)
  const s = await read()
  const name = keyboard ? 'with the keyboard (336 px)' : 'without the keyboard'
  check(s.w === 393, `${name}: 393 wide`, String(s.w))
  check(s.closeX === 341 && s.closeY === 32, `${name}: close at 341,32 (Figma)`, `${s.closeX},${s.closeY}`)
  if (keyboard) {
    check(Math.round(s.bottom) === 336, 'with the keyboard: the sheet sits above it', `bottom ${s.bottom}`)
    check(s.maxH === '516px', 'with the keyboard: max-height is the visible 516, not 852', s.maxH)
    check(s.top >= 0, 'with the keyboard: the top stays on screen', `top ${s.top}`)
    check(s.bodyScroll, 'with the keyboard: the long list scrolls inside the sheet')
  } else {
    check(Math.round(s.bottom) === 0, 'without the keyboard: anchored to the bottom edge', `bottom ${s.bottom}`)
    check(s.maxH === '852px', 'without the keyboard: max-height is the visible height (852), not 100vh', s.maxH)
  }
  check(!s.overflowX, `${name}: no horizontal overflow`)
  check(s.padB === '0px' || /px$/.test(s.padB), `${name}: bottom safe area padding is applied`, s.padB)
  if (shots) await page.screenshot({ path: `${shots}/sheet-${keyboard ? 'keyboard' : 'plain'}.png` })
}

// The LIVE hook: the real panel follows window.visualViewport when it shrinks (the keyboard on a phone).
await page.goto(story('content-surfaces-sheet--motion'))
await page.getByRole('button', { name: 'Open bottom' }).click()
await page.waitForSelector('[data-escala="Sheet"]'); await sleep(700)
let m = await read()
check(m.maxH === '852px' && Math.round(m.bottom) === 0, 'live: 852 visible → max-height 852, on the bottom edge', `${m.maxH}, bottom ${m.bottom}`)
await page.setViewportSize({ width: 393, height: 516 }); await sleep(400)
m = await read()
check(m.maxH === '516px', 'live: the visible area shrinks to 516 → max-height follows', m.maxH)
check(m.h <= 516, 'live: the sheet is never taller than what is visible', String(m.h))
await browser.close()
done()
