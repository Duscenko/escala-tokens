// Sheet · motion. The real open / close lifecycle on every side, in full and in reduced motion: computed animation-name and
// duration / easing against the choreography `sheet-enter` / `sheet-exit`, the panel sampled mid-animation, and the exit
// playing BEFORE the panel unmounts. Run with Storybook up: node scripts/storybook-checks/sheet-motion.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('Sheet motion')
const browser = await launch()
const SIDES = ['right', 'left', 'bottom']

for (const reduced of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  await page.goto(story('content-surfaces-sheet--motion'))
  await page.getByRole('button', { name: 'Open right' }).waitFor()
  const mode = reduced ? 'reduced motion' : 'full motion'
  for (const side of SIDES) {
    await page.getByRole('button', { name: `Open ${side}` }).click()
    await page.waitForSelector('[data-escala="Sheet"]')
    const enter = await page.evaluate(() => {
      const el = document.querySelector('[data-escala="Sheet"]'), ov = document.querySelector('[data-part="Sheet.overlay"]')
      const cs = getComputedStyle(el), os = getComputedStyle(ov)
      return { name: cs.animationName, dur: cs.animationDuration, ease: cs.animationTimingFunction, oname: os.animationName, odur: os.animationDuration, x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().top, w: innerWidth, h: innerHeight, opacity: cs.opacity }
    })
    const slide = `motion-slide-in-${side}`
    check(enter.name === (reduced ? 'motion-fade-in' : slide), `${side} · ${mode}: enter plays ${reduced ? 'a fade' : slide}`, enter.name)
    check(enter.oname === 'motion-fade-in', `${side} · ${mode}: the scrim fades in`, `${enter.oname} ${enter.odur}`)
    check(/^0\.\d+s$/.test(enter.dur), `${side} · ${mode}: duration comes from the tokens`, `${enter.dur} ${enter.ease}`)
    // Mid-animation: the travel is neither at its start nor at its end.
    await sleep(reduced ? 40 : 110)
    const mid = await page.evaluate(() => { const el = document.querySelector('[data-escala="Sheet"]'); const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, o: +getComputedStyle(el).opacity } })
    if (reduced) check(mid.o > 0 && mid.o < 1 || mid.o === 1, `${side} · ${mode}: no travel, opacity ${mid.o.toFixed(2)}`, `left ${mid.l}`)
    else {
      const start = side === 'right' ? 1280 : side === 'left' ? -400 : 800 - 0
      const end = side === 'right' ? 880 : side === 'left' ? 0 : 800 - 272
      const pos = side === 'bottom' ? mid.t : mid.l
      const lo = Math.min(start, end), hi = Math.max(start, end)
      check(pos > lo && pos < hi, `${side}: sampled mid-travel at ${Math.round(pos)}px (${lo}…${hi})`)
    }
    await sleep(600)
    const rest = await page.evaluate(() => { const r = document.querySelector('[data-escala="Sheet"]').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight } })
    check(Math.abs(side === 'right' ? rest.r - rest.w : side === 'left' ? rest.l : rest.b - rest.h) < 1, `${side} · ${mode}: comes to rest on its edge`)
    // Exit: closed state, exit animation running, still mounted, then gone.
    await page.keyboard.press('Escape')
    await sleep(40)
    const exit = await page.evaluate(() => { const el = document.querySelector('[data-escala="Sheet"]'); if (!el) return null; const cs = getComputedStyle(el); return { state: el.dataset.state, name: cs.animationName, dur: cs.animationDuration } })
    check(exit !== null, `${side} · ${mode}: still mounted while the exit plays`)
    if (exit) {
      check(exit.state === 'closed' && exit.name === (reduced ? 'motion-fade-out' : `motion-slide-out-${side}`), `${side} · ${mode}: exit plays ${exit.name}`, exit.dur)
    }
    await sleep(600)
    check(await page.evaluate(() => !document.querySelector('[data-escala="Sheet"]')), `${side} · ${mode}: unmounted after the exit`)
  }
  await ctx.close()
}
await browser.close()
done()
