// FABGroup motion: items reveal on list-reveal (use-stagger-in, forward, the stagger step) and dismiss on list-dismiss (use-stagger-out, last first,
// 0.6 of the step), per layout; closed items are hidden; reduced motion drops the delay and the travel.
// Run with Storybook up: node scripts/storybook-checks/fab-group-motion.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('fab group motion')
const browser = await launch()
for (const reduced of [false, true]) {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const tag = reduced ? 'reduced' : 'full'
  await page.goto(story('buttons-fabgroup--motion')); await sleep(1500)
  const groups = page.locator('[data-escala=FABGroup]')
  for (let g = 0; g < 4; g++) {
    const group = groups.nth(g)
    const layout = await group.getAttribute('data-layout')
    const items = group.locator('[data-part="FABGroup.item"]')
    const read = () => items.evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { o: +cs.opacity, v: cs.visibility, d: parseFloat(cs.transitionDelay) * 1000, t: cs.transform, name: cs.transitionProperty } }))
    const stagger = await group.evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--motion-stagger')))
    const n = await items.count()
    const closed = await read()
    check(closed.every((i) => i.v === 'hidden' && i.o === 0), `${tag} · ${layout}: closed items are hidden`, `${n} items`)
    const trigger = group.locator('[aria-expanded]')
    await trigger.click(); await sleep(20)
    const start = await read()
    const delays = start.map((i) => Math.round(i.d))
    check(delays.every((d, i) => Math.abs(d - i * stagger) < 1), `${tag} · ${layout}: reveal forward at the stagger step`, `${delays} (step ${stagger})`)
    if (!reduced && layout !== 'stack') check(start.some((i) => i.o < 1) || start.some((i) => i.t !== 'none'), `${tag} · ${layout}: starts off its arc (travel)`)
    if (reduced) check(delays.every((d) => d === 0) && closed.every((i) => i.t === 'none' || i.t === 'matrix(1, 0, 0, 1, 0, 0)'), `${tag} · ${layout}: no delay, no travel`)
    await sleep(900)
    const open = await read()
    check(open.every((i) => i.o === 1 && i.v === 'visible'), `${tag} · ${layout}: settled open`)
    await trigger.click(); await sleep(20)
    const out = await read()
    const outDelays = out.map((i) => Math.round(i.d))
    check(outDelays.every((d, i) => Math.abs(d - (n - 1 - i) * stagger * 0.6) < 1.5), `${tag} · ${layout}: dismiss last item first at 0.6 of the step`, `${outDelays}`)
    await sleep(900)
    const after = await read()
    check(after.every((i) => i.o === 0 && i.v === 'hidden'), `${tag} · ${layout}: settled closed and hidden`)
  }
  check(errors.length === 0, `${tag}: no error`, errors.join(' | '))
}
await browser.close()
done()
