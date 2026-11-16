// The Mobile stories draw the block on a 393 x 852 screen: the block sits at the page inset (Grid margin, Mobile) from both edges, in the
// Mobile typography mode, the frame's corners are a role (radius.container), and nothing is clipped by the frame.
// Run with Storybook up: node scripts/storybook-checks/signin-phone-frame.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('signin phone frame')
const browser = await launch()
const page = await (await browser.newContext({ viewport: { width: 1000, height: 1000 } })).newPage()
for (const id of ['blocks-auth-signinphone--mobile', 'blocks-auth-signinphone--mobile-keyboard']) {
  await page.goto(story(id)); await sleep(1800)
  const r = await page.evaluate(() => {
    const block = document.querySelector('[data-block=AuthSignInPhone]')
    const frame = block.closest('div[style*="393px"]')
    const fr = frame.getBoundingClientRect(), br = block.getBoundingClientRect()
    const px = (name) => { const d = document.createElement('div'); d.style.width = `var(${name})`; frame.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w }
    const clipped = [...block.querySelectorAll('*')].filter((e) => { const x = e.getBoundingClientRect(); return x.width && (x.left < fr.left + 1 || x.right > fr.right - 1) }).length
    return { fw: fr.width, left: br.left - fr.left, right: fr.right - br.right, inset: px('--spacing-inset-page'), radius: parseFloat(getComputedStyle(frame).borderTopLeftRadius), want: px('--radius-container'), clipped }
  })
  check(r.fw === 393, `${id}: 393 wide`, `${r.fw}`)
  check(Math.abs(r.left - r.inset) < 1 && Math.abs(r.right - r.inset) < 1, `${id}: page inset on both sides`, `${r.left} / ${r.right} vs ${r.inset}`)
  check(r.inset === 16, `${id}: Mobile mode (inset-page 16)`, `${r.inset}`)
  check(Math.abs(r.radius - r.want) < 1, `${id}: frame corners = radius.container`, `${r.radius} vs ${r.want}`)
  check(r.clipped === 0, `${id}: nothing touches or crosses the frame edge`, `${r.clipped}`)
}
await browser.close()
done()
