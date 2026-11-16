// axe-core on a list of stories, in Escala Light and Dark (the Storybook addon runs the same engine; a violation fails a story there).
// Run with Storybook up: node scripts/storybook-checks/axe.mjs [storyId …]
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { checker, launch, sleep, story } from './lib.mjs'

const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const { check, done } = checker('axe')
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [
  'content-surfaces-sheet--sides', 'content-surfaces-sheet--mobile', 'blocks-overlay-cartdrawer--playground', 'blocks-overlay-filterdrawer--playground',
  'blocks-auth-signinphone--states', 'blocks-auth-signinphone--picker-open', 'blocks-auth-signinphone--picker-selected', 'forms-input--phone-filled-states',
  // the 16 Nov review fixes: the focus halo in dialogs, the header menu, the contact section, the pickers, the range, the FAB motion
  'blocks-overlay-feedbackrating--playground', 'blocks-overlay-destructiveconfirm--playground', 'blocks-navigation-appheader--playground', 'blocks-navigation-dualsidebar--playground',
  'blocks-marketing-contactsection--layouts', 'forms-input--resting-focused', 'forms-datepicker--date-picker-trigger-playground', 'forms-calendar--range-selection', 'buttons-fabbutton--fab-group-layouts', 'blocks-auth-signinphone--mobile',
]
const browser = await launch()
for (const theme of ['light', 'dark']) {
  const page = await (await browser.newContext({ viewport: { width: 2200, height: 1000 }, locale: 'en-US' })).newPage()
  for (const id of ids) {
    await page.goto(story(id, `theme:${theme}`))
    await sleep(2200)
    await page.evaluate(axe)
    const res = await page.evaluate(() => window.axe.run(document.querySelector('#storybook-root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }))
    // Known finding, tracked in an issue: Content/secondary on Surface/selected (the chosen row's calling code) in Light.
    // Also known (COL-005): the DatePickerTrigger placeholder (Content/subtle, 3.0:1) and the Disabled phone addon.
    const known = (x) => x.id === 'color-contrast' && ((id === 'blocks-auth-signinphone--picker-open' && theme === 'light') || id === 'forms-datepicker--date-picker-trigger-playground' || id === 'forms-input--phone-filled-states')
    const v = res.violations.filter((x) => !known(x)).map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].html.slice(0, 90)}`)
    check(v.length === 0, `${id} · ${theme}`, v.join(' | '))
  }
}
await browser.close()
done()
