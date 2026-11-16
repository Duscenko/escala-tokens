// DatePicker (DatePickerTrigger + DatePickerPopover): a click opens the calendar on the popover's motion, a day closes it into the trigger.
// Run with Storybook up: node scripts/storybook-checks/date-picker.mjs
import { checker, launch, sleep, story } from './lib.mjs'

const { check, done } = checker('date picker')
const browser = await launch()
for (const reduced of [false, true]) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const tag = reduced ? 'reduced' : 'full'
  await page.goto(story('forms-datepicker--date-picker-trigger-playground')); await sleep(1500)
  const trigger = page.locator('[data-escala=DatePickerTrigger]').first()
  check(await trigger.getAttribute('aria-expanded') === 'false', `${tag}: starts closed`)
  await trigger.click()
  const panel = page.locator('[data-escala=DatePickerPopover]')
  await panel.waitFor({ timeout: 3000 })
  const name = await panel.evaluate((p) => getComputedStyle(p).animationName)
  check(reduced ? true : name !== 'none', `${tag}: opens on a choreography`, name)
  const gap = await page.evaluate(() => { const t = document.querySelector('[data-escala=DatePickerTrigger]').getBoundingClientRect(), p = document.querySelector('[data-escala=DatePickerPopover]').getBoundingClientRect(); return { gap: p.top - t.bottom, left: p.left - t.left } })
  await sleep(500)
  const g2 = await page.evaluate(() => { const t = document.querySelector('[data-escala=DatePickerTrigger]').getBoundingClientRect(), p = document.querySelector('[data-escala=DatePickerPopover]').getBoundingClientRect(); return p.top - t.bottom })
  check(Math.abs(g2 - 8) < 1, `${tag}: anchored 8px under the trigger once settled`, `${g2}`)
  await page.getByRole('button', { name: / 15, \d{4}$/ }).click()
  await sleep(700)
  check(await panel.count() === 0, `${tag}: a day closes it`)
  check(/15, \d{4}/.test(await trigger.innerText()), `${tag}: the day is in the trigger`, await trigger.innerText())
  check(await trigger.evaluate((t) => document.activeElement === t), `${tag}: focus returns to the trigger`)
  await page.keyboard.press('Enter'); await sleep(400)
  check(await panel.count() === 1, `${tag}: Enter reopens`)
  await page.keyboard.press('Escape'); await sleep(600)
  check(await panel.count() === 0, `${tag}: Escape closes`)
  check(errors.length === 0, `${tag}: no error`, errors.join(' | '))
}
await browser.close()
done()
