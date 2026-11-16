// The header avatar opens the account DropdownMenu (it used to throw on focus). Click, keyboard, motion, Escape, focus return.
// Run with Storybook up: node scripts/storybook-checks/account-menu.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('account menu')
const browser = await launch()
for (const [id, vp] of [['blocks-navigation-appheader--playground', { width: 1400, height: 700 }], ['blocks-navigation-appheader--layouts', { width: 1400, height: 1000 }], ['blocks-navigation-appheaderextended--playground', { width: 1400, height: 800 }], ['blocks-navigation-floatingheader--playground', { width: 1400, height: 700 }]]) {
  const page = await (await browser.newContext({ viewport: vp, locale: 'en-US' })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text().slice(0, 120)) })
  await page.goto(story(id)); await sleep(1500)
  const trigger = page.locator('[data-escala=AccountMenuTrigger]').first()
  await trigger.click()
  const menu = page.locator('[role=menu]')
  await menu.waitFor({ timeout: 3000 }).catch(() => {})
  check(await menu.count() === 1, `${id}: a click opens the menu`)
  check(errors.length === 0, `${id}: no error`, errors.join(' | '))
  const items = await page.locator('[role=menuitem]').allTextContents()
  check(items.join('|') === 'Profile|Billing|Settings|Log out', `${id}: rows`, items.join('|'))
  const anim = await menu.evaluate((m) => getComputedStyle(m).animationName)
  check(anim !== 'none', `${id}: opens on the dropdown choreography`, anim)
  check(await trigger.getAttribute('aria-expanded') === 'true', `${id}: aria-expanded`)
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape'); await sleep(500)
  check(await page.locator('[role=menu]').count() === 0, `${id}: Escape closes`)
  check(await trigger.evaluate((t) => document.activeElement === t), `${id}: focus returns to the avatar`)
  await trigger.focus(); await page.keyboard.press('Enter'); await sleep(400)
  check(await page.locator('[role=menu]').count() === 1, `${id}: Enter opens from the keyboard`)
}
await browser.close()
done()
