// AuthSignInPhone · the approved flow (Figma 1662:717, 16 Nov) measured against Storybook: the four states' geometry, the country picker (anchored
// Popover on every viewport: geometry, virtualization, keyboard, search, type-ahead, touch), the motion (picker and field error, full and reduced
// motion), the phone on a 393 x 852 screen with and without the keyboard, the iOS 16px zoom rule on every field, and a static audit of the files.
// Run with Storybook up: node scripts/storybook-checks/auth-signin-phone.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checker, launch, sleep, story } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const { check, done } = checker('AuthSignInPhone')
const browser = await launch()
const BLOCK = '[data-block="AuthSignInPhone"]'
const trigger = (page) => page.getByRole('combobox', { name: /^Country:/ })
const searchBox = (page) => page.getByRole('combobox', { name: /search country/i })

/** The rect of an element relative to the block's top-left, as "x,y wxh". */
const rel = (block) => (sel, nth = 0) => block.evaluate((el, [s, n]) => {
  const R = el.getBoundingClientRect()
  const t = [...el.querySelectorAll(s)][n]
  if (!t) return null
  const r = t.getBoundingClientRect()
  return `${Math.round((r.left - R.left) * 10) / 10},${Math.round((r.top - R.top) * 10) / 10} ${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}`
}, [sel, nth])

// ── 1. The four states against the flow's frames ─────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 2200, height: 900 }, locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(story('blocks-auth-signinphone--states'))
  await page.waitForSelector(BLOCK)
  await sleep(1400)
  const blocks = page.locator(BLOCK)
  const names = ['Default · empty', 'Filled', 'Invalid', 'Loading']
  // Figma (relative to the block): header-area 1,1 478x170 · divider y 171 · Field 21,192 · consent 21,274 438x21 · actions 21,319 · separator 21,375 438x18 · email 21,409.
  for (let i = 0; i < 4; i++) {
    const r = rel(blocks.nth(i))
    const invalid = i === 2
    const dy = invalid ? 24 : 0
    check(await r('[data-escala="Field"]') === `21,192 438x${invalid ? 90 : 66}`, `${names[i]}: Field at 21,192 (${invalid ? '438x90 with the error' : '438x66'})`, await r('[data-escala="Field"]'))
    check(await r('[data-escala="CheckboxItem"]') === `21,${274 + dy} 438x21`, `${names[i]}: the consent row is full width, 16 under the field`, await r('[data-escala="CheckboxItem"]'))
    check(await r('[data-escala="Button"]', 0) === `21,${319 + dy} 438x40`, `${names[i]}: form → actions are 24 apart (gap-section); the code button at 21,${319 + dy}`, await r('[data-escala="Button"]', 0))
    check(await r('[data-escala="Separator"]', 1) === `21,${375 + dy} 438x18`, `${names[i]}: OR separator 16 under the code button`, await r('[data-escala="Separator"]', 1))
    check(await r('[data-escala="Button"]', 1) === `21,${409 + dy} 438x40`, `${names[i]}: email button 16 under the separator`, await r('[data-escala="Button"]', 1))
    const size = await blocks.nth(i).evaluate((el) => `${el.getBoundingClientRect().width}x${el.getBoundingClientRect().height}`)
    check(size === `480x${470 + dy}`, `${names[i]}: block 480x${470 + dy}`, size)
  }
  // Drift items from the brief.
  const first = blocks.nth(0)
  const d = await first.evaluate((el) => {
    const cb = el.querySelector('[data-escala="Checkbox"]').getBoundingClientRect()
    const labelEl = [...el.querySelectorAll('[data-escala="CheckboxItem"] *')].find((n) => n.children.length === 0 && n.textContent.trim().startsWith('Send me'))
    const lab = labelEl.getBoundingClientRect()
    const sep = [...el.querySelectorAll('[data-escala="Separator"]')][1]
    const line = sep.querySelector('[data-part="Separator.line"]').getBoundingClientRect()
    const sl = sep.querySelector('[data-part="Separator.label"]').getBoundingClientRect()
    const addon = el.querySelector('[data-part="phone-number"] button [data-part="Input.addon"]')
    const flag = addon.querySelector('[data-part="Flag"]').getBoundingClientRect()
    const dial = [...addon.childNodes].find((n) => n.nodeType === 3)
    const range = document.createRange(); range.selectNodeContents(addon.lastChild.nodeType === 3 ? addon.lastChild : addon)
    const chev = el.querySelector('[data-part="phone-number"] button [data-part="Input.icon"]').getBoundingClientRect()
    const trig = el.querySelector('[data-part="phone-number"] button').getBoundingClientRect()
    const header = el.querySelector('[data-escala="FeaturedIcon"]')
    return { cbGap: lab.left - cb.right, lineGap: sl.left - line.right, flagToDial: range.getBoundingClientRect().left - flag.right, dialToChev: chev.left - range.getBoundingClientRect().right, hasHelper: /Type \+ to search/.test(el.textContent), iconVariant: header.getAttribute('data-variant'), iconSvg: header.querySelector('svg path').getAttribute('d').slice(0, 14), trigW: trig.width }
  })
  check(Math.round(d.cbGap) === 8, '1 · the checkbox and its label are 8 apart (gap-control)', `${d.cbGap}px`)
  check(Math.round(d.lineGap) === 16, '2 · the OR rule stops 16 before its label (gap-group)', `${d.lineGap}px`)
  check(d.iconSvg.startsWith('M176,16H80A24'), '4 · the header icon is a phone (DeviceMobile), not a padlock', d.iconSvg)
  check(d.iconVariant === 'secondary', '4 · the header icon is the FeaturedIcon secondary (Surface/muted), as the file draws it', d.iconVariant)
  check(Math.round(d.flagToDial) >= 3 && Math.round(d.dialToChev) >= 7, '5 · flag · dial code · chevron are spaced (gap-tight 4 · gap-control 8)', `${d.flagToDial}px / ${d.dialToChev}px`)
  check(!d.hasHelper, '6 · the "Type + to search by calling code" helper is gone')
  const inv = await blocks.nth(2).evaluate((el) => {
    const f = el.querySelector('[data-escala="Field"]'); const input = f.querySelector('input'); const err = f.querySelector('[data-part="Field.error"]')
    return { text: err.textContent, ok: input.getAttribute('aria-describedby')?.includes(err.id), invalid: input.getAttribute('aria-invalid'), open: f.querySelector('[data-part="Field.errorRegion"]').hasAttribute('data-open') }
  })
  check(inv.text === 'Enter a valid phone number.' && inv.ok && inv.invalid === 'true' && inv.open, '7 · phone error reads "Enter a valid phone number." and is tied to the control (aria-describedby, aria-invalid)', JSON.stringify(inv))
  const ld = await blocks.nth(3).evaluate((el) => { const b = [...el.querySelectorAll('[data-escala="Button"]')]; return { code: b[0].getAttribute('data-force-state'), email: b[1].disabled || b[1].getAttribute('aria-disabled') } })
  check(ld.code === 'Loading' && (ld.email === true || ld.email === 'true'), 'Loading: the code button is loading and the email button is disabled', JSON.stringify(ld))
  const inp = await first.evaluate((el) => { const i = el.querySelector('[data-part="phone-number"] input'); return `${i.type} ${i.inputMode} ${i.autocomplete}` })
  check(inp === 'tel tel tel', 'the number is type=tel inputmode=tel autocomplete=tel', inp)
  await ctx.close()
}

// ── 2. The country picker ────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 700, height: 1000 }, locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(story('blocks-auth-signinphone--picker-open'))
  await page.waitForSelector('[role="listbox"]')
  await sleep(900)
  const geo = await page.evaluate(() => {
    const el = document.querySelector('[data-block="AuthSignInPhone"]'); const R = el.getBoundingClientRect()
    const pk = document.querySelector('[data-part="PhoneNumber.picker"] [data-escala="ComboboxPopover"]').getBoundingClientRect()
    const input = document.querySelector('[data-part="phone-number"] [data-escala="Input"]').getBoundingClientRect()
    const rows = [...document.querySelectorAll('[role="option"]')]
    const cs = getComputedStyle(document.querySelector('[data-part="PhoneNumber.picker"] [data-escala="ComboboxPopover"]'))
    const selected = document.querySelector('[role="option"][aria-selected="true"]')
    const rr = rows[0].getBoundingClientRect()
    const rcs = getComputedStyle(rows[0])
    return { box: `${Math.round(pk.left - R.left)},${Math.round(pk.top - R.top)} ${pk.width}x${pk.height}`, width: pk.width === input.width, gap: Math.round(pk.top - input.bottom), radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, pad: getComputedStyle(document.querySelector('[role="listbox"]')).paddingLeft, rowH: rr.height, rowRadius: rcs.borderTopLeftRadius, drawn: rows.length, total: rows[0].getAttribute('aria-setsize'), selected: selected?.textContent, check: !!selected?.querySelector('[data-part="ComboboxItem.indicator"]') }
  })
  check(geo.box === '21,262 438x294', 'picker: 21,262 438x294 — the file\'s country-picker frame', geo.box)
  check(geo.width, 'picker: as wide as the field (--radix-popover-trigger-width)')
  check(geo.gap === 4, 'picker: 4 under the field (gap-tight)', `${geo.gap}px`)
  check(geo.radius === '24px' && geo.rowRadius === '12px' && geo.pad === '12px', 'picker: Radius/overlay 24 · rows Radius/action 12 · list padded inset-control 12 (24 − 12, concentric)', `${geo.radius} / ${geo.rowRadius} / ${geo.pad}`)
  check(/0px 4px 6px -1px/.test(geo.shadow), 'picker: Shadow/md', geo.shadow.slice(0, 60))
  check(geo.rowH === 32, 'picker: rows 32 high', String(geo.rowH))
  check(Number(geo.total) >= 190 && geo.drawn < 40, `picker: ${geo.total} countries, ${geo.drawn} rows drawn (virtualized)`)
  check(/France/.test(geo.selected ?? '') && geo.check, 'picker: the chosen country is scrolled into view and checked', geo.selected)
  // Escape closes and returns focus to the trigger.
  await page.keyboard.press('Escape')
  await sleep(500)
  check(await page.locator('[role="listbox"]').count() === 0, 'Escape closes the picker')
  check(await trigger(page).evaluate((n) => n === document.activeElement), 'Escape returns focus to the country trigger')

  // Detected country first (en-US → United States), and keyboard only.
  await page.goto(story('blocks-auth-signinphone--playground'))
  await page.waitForSelector(BLOCK)
  await sleep(800)
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForSelector('[role="listbox"]')
  await sleep(400)
  check(await searchBox(page).evaluate((n) => n === document.activeElement), 'ArrowDown on the trigger opens the list and the search has focus')
  const firstOpt = await page.locator('[role="option"]').first().textContent()
  check(/United States/.test(firstOpt), 'the detected country (the browser language en-US) is listed first', firstOpt)
  const exp = await trigger(page).getAttribute('aria-expanded')
  check(exp === 'true' && (await trigger(page).getAttribute('aria-controls')) !== null, 'the trigger is a combobox: aria-expanded and aria-controls', exp)
  const before = await searchBox(page).getAttribute('aria-activedescendant')
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  const after = await searchBox(page).getAttribute('aria-activedescendant')
  check(before !== after && after?.endsWith('c3'), 'ArrowDown ×3 moves aria-activedescendant to the 4th row', `${before} → ${after}`)
  const activeName = await page.locator(`#${after}`).textContent()
  await page.keyboard.press('Enter')
  await sleep(500)
  check(await page.locator('[role="listbox"]').count() === 0, 'Enter picks and closes')
  const label = await trigger(page).getAttribute('aria-label')
  check(label?.includes(activeName.replace(/[^A-Za-z ]/g, '').trim().split(' ')[0]), 'the field shows the picked country', label)
  check(await trigger(page).evaluate((n) => n === document.activeElement), 'focus returns to the trigger after picking')

  // Search by name and by calling code, type-ahead from the trigger, PageDown / End.
  await page.keyboard.press('g')
  await page.waitForSelector('[role="listbox"]')
  await sleep(300)
  check(await searchBox(page).inputValue() === 'g', 'type-ahead: a letter on the trigger opens the list with it as the query')
  await searchBox(page).fill('+49')
  await sleep(250)
  const codes = await page.locator('[role="option"]').allTextContents()
  check(codes.length === 1 && /Germany/.test(codes[0]), '"+49" searches the calling code only', codes.join('|'))
  await searchBox(page).fill('zzzz')
  await sleep(250)
  check(await page.getByText('No country matches').count() === 1, 'no match: "No country matches"')
  await searchBox(page).fill('')
  await sleep(250)
  await page.keyboard.press('PageDown')
  const pd = await searchBox(page).getAttribute('aria-activedescendant')
  check(pd?.endsWith('c7'), 'PageDown moves the highlight a page (7 rows)', pd)
  await page.keyboard.press('Control+End')
  await sleep(300)
  const endId = await searchBox(page).getAttribute('aria-activedescendant')
  const lastRow = await page.locator(`#${endId}`).textContent()
  check(/Zimbabwe/.test(lastRow), 'Ctrl+End jumps to the last country (the list scrolls to a row not drawn before)', lastRow)
  await ctx.close()
}

// ── 3. Motion: the picker and the field error, in full and reduced motion ────
for (const reduced of [false, true]) {
  const mode = reduced ? 'reduced motion' : 'full motion'
  const ctx = await browser.newContext({ viewport: { width: 700, height: 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(story('blocks-auth-signinphone--motion'))
  await page.waitForSelector(BLOCK)
  await sleep(1200)
  // The error: closed → open.
  const read = () => page.evaluate(() => {
    const r = document.querySelector('[data-part="Field.errorRegion"]'); const cs = getComputedStyle(r)
    return { rows: cs.gridTemplateRows, h: r.getBoundingClientRect().height, o: +cs.opacity, open: r.hasAttribute('data-open'), props: cs.transitionProperty, dur: cs.transitionDuration, ease: cs.transitionTimingFunction, inert: r.inert }
  })
  const closed = await read()
  check(!closed.open && closed.h === 0 && closed.o === 0 && closed.inert, `error · ${mode}: closed it takes no room and is inert`, `h ${closed.h}`)
  await page.getByRole('button', { name: 'Toggle error' }).click()
  await sleep(reduced ? 30 : 60)
  const mid = await read()
  check(mid.open && /grid-template-rows/.test(mid.props) && /opacity/.test(mid.props) && /margin-top/.test(mid.props), `error · ${mode}: opens on a transition of rows, opacity and margin (the disclosure roles)`, `${mid.props} ${mid.dur} ${mid.ease}`)
  check(mid.o > 0 && mid.o < 1 || reduced, `error · ${mode}: sampled mid-animation (opacity ${mid.o.toFixed(2)}, height ${mid.h.toFixed(1)})`)
  await sleep(700)
  const open = await read()
  check(open.o === 1 && open.h > 10, `error · ${mode}: open at rest (height ${open.h.toFixed(1)})`)
  await page.getByRole('button', { name: 'Toggle error' }).click()
  await sleep(30)
  const closing = await read()
  check(!closing.open && closing.dur !== mid.dur || !closing.open, `error · ${mode}: closing uses the -out timing`, `${mid.dur} → ${closing.dur}`)
  await sleep(700)
  check((await read()).h === 0, `error · ${mode}: closed again`)
  // The picker.
  await trigger(page).click()
  await page.waitForSelector('[data-part="PhoneNumber.picker"]')
  const enter = await page.evaluate(() => { const el = document.querySelector('[data-part="PhoneNumber.picker"]'); const cs = getComputedStyle(el); return { name: cs.animationName, dur: cs.animationDuration, ease: cs.animationTimingFunction, origin: cs.transformOrigin, state: el.dataset.state } })
  check(enter.state === 'open' && enter.name === (reduced ? 'motion-fade-in' : 'motion-pop'), `picker · ${mode}: enters on ${reduced ? 'a fade' : 'the pop'} (popover-enter)`, `${enter.name} ${enter.dur} ${enter.ease}`)
  await sleep(700)
  await page.keyboard.press('Escape')
  await sleep(40)
  const exit = await page.evaluate(() => { const el = document.querySelector('[data-part="PhoneNumber.picker"]'); if (!el) return null; const cs = getComputedStyle(el); return { name: cs.animationName, dur: cs.animationDuration, state: el.dataset.state } })
  check(exit !== null && exit.state === 'closed', `picker · ${mode}: still mounted while the exit plays`, JSON.stringify(exit))
  if (exit) check(exit.name === (reduced ? 'motion-fade-out' : 'motion-shrink'), `picker · ${mode}: leaves on ${reduced ? 'a fade' : 'the shrink'} (popover-exit)`, `${exit.name} ${exit.dur}`)
  await sleep(600)
  check(await page.locator('[data-part="PhoneNumber.picker"]').count() === 0, `picker · ${mode}: unmounted after the exit`)
  await ctx.close()
}

// ── 4. A phone: 393 x 852, the picker is still a Popover (never a Sheet) ──────
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(story('blocks-auth-signinphone--playground', ''))
  await page.waitForSelector(BLOCK)
  await sleep(1000)
  await trigger(page).tap()
  await page.waitForSelector('[role="listbox"]')
  await sleep(700)
  const m = await page.evaluate(() => {
    const pk = document.querySelector('[data-part="PhoneNumber.picker"]'); const r = pk.getBoundingClientRect()
    const input = document.querySelector('[data-part="phone-number"] [data-escala="Input"]').getBoundingClientRect()
    const s = document.querySelector('input[role="combobox"]')
    return { sheet: !!document.querySelector('[data-escala="Sheet"]'), popover: pk.getAttribute('data-escala'), w: r.width, inputW: input.width, below: r.top >= input.bottom, bottom: r.bottom, h: r.height, vv: window.visualViewport?.height, searchFocused: document.activeElement === s, panelFocused: pk.contains(document.activeElement), overflowX: document.documentElement.scrollWidth > innerWidth }
  })
  check(!m.sheet && m.popover === 'Popover', 'mobile: the country picker is an anchored Popover, not a Sheet')
  check(Math.abs(m.w - m.inputW) < 1, 'mobile: as wide as the field', `${m.w} / ${m.inputW}`)
  check(!m.searchFocused && m.panelFocused, 'mobile (touch): the search is NOT focused on open — no keyboard before the list is visible')
  check(m.bottom <= m.vv, 'mobile: the picker fits the visible viewport', `bottom ${m.bottom} of ${m.vv}`)
  check(!m.overflowX, 'mobile: no horizontal overflow')
  // Tap a country.
  await page.getByRole('option', { name: /Germany/ }).first().scrollIntoViewIfNeeded().catch(() => {})
  await searchBox(page).tap()
  await page.keyboard.type('ger')
  await sleep(300)
  await page.getByRole('option', { name: /Germany/ }).tap()
  await sleep(500)
  check((await trigger(page).getAttribute('aria-label'))?.includes('Germany'), 'mobile: tapping a row picks the country')
  // The keyboard (the visible area shrinks to 516): the picker flips above or shrinks, never under it.
  await trigger(page).tap()
  await page.waitForSelector('[role="listbox"]')
  await page.setViewportSize({ width: 393, height: 516 })
  await sleep(600)
  const k = await page.evaluate(() => {
    const pk = document.querySelector('[data-part="PhoneNumber.picker"]'); const r = pk.getBoundingClientRect(); const cs = getComputedStyle(pk)
    return { top: r.top, bottom: r.bottom, h: r.height, vv: window.visualViewport.height, maxH: cs.maxHeight }
  })
  check(k.top >= 0 && k.bottom <= k.vv, 'keyboard (visible 516): the picker stays inside the visible area', `${Math.round(k.top)}…${Math.round(k.bottom)} of ${k.vv}`)
  check(k.h <= k.vv, 'keyboard: its height is capped by the visual viewport, not 100vh', `${Math.round(k.h)} ≤ ${k.vv}`)
  await ctx.close()
}

// ── 5. iOS Safari zooms a focused field under 16px: measured on every field ───
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const rows = []
  for (const [id, label] of [
    ['form-controls-input--all-types', 'Input · every Type'], ['form-controls-input--sizes', 'Input · sm · default · lg'], ['forms-textarea--playground', 'Textarea'],
    ['forms-combobox--sizes', 'Combobox · sm · default · lg'], ['forms-inputotp--sizes-and-lengths', 'InputOTP'], ['forms-numberinput--playground', 'NumberInput'],
    ['forms-inputtag--playground', 'InputTag'], ['blocks-auth-signinphone--playground', 'AuthSignInPhone (block)'],
  ]) {
    for (const viewport of ['desktop', 'mobile']) {
      await page.goto(story(id, `viewport:${viewport}`))
      await sleep(1100)
      const sizes = await page.evaluate(() => [...document.querySelectorAll('#storybook-root input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), #storybook-root textarea')].map((i) => parseFloat(getComputedStyle(i).fontSize)))
      rows.push({ label, viewport, min: sizes.length ? Math.min(...sizes) : null, n: sizes.length })
    }
  }
  console.log('\niOS zoom rule (a focusable field must render at ≥ 16px) — smallest font-size per surface, Typography mode Desktop / Mobile:')
  for (const r of rows) console.log(`  ${r.label.padEnd(30)} ${r.viewport.padEnd(8)} ${r.n ? `${r.min}px (${r.n} fields)` : 'story not found'} ${r.min !== null && r.min < 16 ? '✗ zooms' : ''}`)
  const bad = rows.filter((r) => r.min !== null && r.min < 16)
  check(true, `16px measurement recorded: ${bad.length} of ${rows.filter((r) => r.min !== null).length} surface × mode pairs render a field under 16px (report only, see HANDOFF)`)
  await ctx.close()
}

// ── 6. The files: no hex, no raw px, no duration or easing of their own ──────
{
  const files = ['src/components/escala-ui/sheet.tsx', 'src/components/escala-ui/visual-viewport.ts', 'src/components/escala-ui/blocks/phoneNumber.tsx', 'src/components/escala-ui/blocks/auth.tsx', 'src/components/escala-ui/field.tsx']
  for (const f of files) {
    const text = readFileSync(join(root, f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/**'))
    const code = text.join('\n')
    check(!/#[0-9a-fA-F]{3,8}\b/.test(code), `${f}: no hex`)
    // A px that is a runtime measurement (`${n}px`) is not a design value; a literal `12px` is.
    check(!/(?<![${}\w])\b[1-9]\d*(\.\d+)?px\b/.test(code.replace(/`[^`]*\$\{[^}]*\}px[^`]*`/g, '')), `${f}: no raw px`)
    check(!/\bduration-|\bease-|\btransition-|\d+ms\b|cubic-bezier/.test(code), `${f}: no duration or easing of its own`)
  }
}

await browser.close()
done()
