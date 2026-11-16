// A focused field draws a `stroke.focus` halo outside its edge. Any ancestor that clips (overflow ≠ visible) must leave that room,
// or the ring reads masked on the sides where the clip touches the field. Measures it in Light and Dark.
// Run with Storybook up: node scripts/storybook-checks/focus-halo.mjs [storyId …]
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('focus halo')
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [
  'blocks-overlay-feedbackrating--playground', 'blocks-overlay-destructiveconfirm--playground', 'blocks-overlay-formmodal--playground',
  'blocks-overlay-quickeditdialog--playground', 'blocks-overlay-sharemodal--playground',
  'blocks-overlay-cartdrawer--playground', 'blocks-auth-signup--playground', 'blocks-auth-newpassword--playground',
  'blocks-auth-signinphone--playground', 'blocks-marketing-contactsection--playground', 'forms-input--types', 'forms-textarea--playground',
]
const browser = await launch()
for (const theme of ['light', 'dark']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage()
  for (const id of ids) {
    await page.goto(story(id, `theme:${theme}`))
    await sleep(1600)
    const fields = await page.evaluate(() => {
      const HALO = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stroke-focus')) || 2
      const out = []
      for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea')) {
        const box = el.closest('[data-escala]') ?? el
        const r = box.getBoundingClientRect()
        if (!r.width) continue
        const clips = []
        for (let n = box.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n)
          if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
          const c = n.getBoundingClientRect()
          const room = { left: r.left - c.left, right: c.right - r.right, top: r.top - c.top, bottom: c.bottom - r.bottom }
          const bad = Object.entries(room).filter(([k, v]) => v < HALO - 0.01 && (k === 'left' || k === 'right' ? cs.overflowX !== 'visible' : cs.overflowY !== 'visible')).map(([k, v]) => `${k} ${v.toFixed(1)}px`)
          if (bad.length) clips.push(`${n.getAttribute('data-part') || n.getAttribute('data-slot') || n.tagName}: ${bad.join(', ')}`)
        }
        out.push({ name: el.getAttribute('aria-label') || el.placeholder || el.name || el.type, clips })
      }
      return out
    })
    check(fields.length > 0, `${id} · ${theme}: has fields`)
    for (const f of fields) check(f.clips.length === 0, `${id} · ${theme} · ${f.name}: halo not clipped`, f.clips.join(' | '))
  }
}
await browser.close()
done()
