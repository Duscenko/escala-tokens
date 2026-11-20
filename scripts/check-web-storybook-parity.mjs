#!/usr/bin/env node
// Parity check: the web platform draws what the Storybook documents. Both are served from their static builds and
// compared in a real browser, value for value:
//
//   1. the recipe stylesheet is the same text;
//   2. every non-colour variable matches, in Light and Dark, on Desktop, Tablet and Mobile;
//   3. every Auth block matches element by element (stacked, inline, and in the phone frame);
//   4. every component in spec/contracts/index.json matches, at the same props, in Light and Dark.
//
// The web keeps its generator and Storybook pins the Figma file's palette and shadows (CLAUDE.md), so colours are not
// compared as values: Storybook's variables are laid over the web's stage first, and what still differs is a wrong role
// or a wrong structure. Web fonts are blocked on both sides, so the result does not depend on the network.
//
// Known differences live in spec/web-storybook-parity.exceptions.json, each with its reason. One that no longer applies
// fails the check, so the list cannot go stale.
//
//   npm run check:web-storybook                 needs `dist` and `apps/storybook/storybook-static`
//   npm run check:web-storybook -- --only=Auth  only the cases whose name contains the text
//   --web=<dir> --storybook=<dir>               other builds
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback
const WEB_DIR = resolve(ROOT, arg('web', 'dist'))
const STORYBOOK_DIR = resolve(ROOT, arg('storybook', 'apps/storybook/storybook-static'))
const ONLY = arg('only', '')
const WORKERS = Number(arg('workers', '4'))
const REPORT = join(ROOT, 'reports/web-storybook-parity.json')
const EXCEPTIONS = JSON.parse(readFileSync(join(ROOT, 'spec/web-storybook-parity.exceptions.json'), 'utf8')).components

const THEMES = ['light', 'dark']
const FRAME = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }
const STAGE = '[data-preview-stage]'
/** What a component's root is compared on. `display` is left out: a flex parent turns inline-flex into flex. */
const ROOT_PROPS = ['flexDirection', 'alignItems', 'justifyContent', 'gap', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'color', 'backgroundColor', 'backgroundImage', 'borderTopWidth', 'borderTopColor', 'borderTopStyle', 'borderTopLeftRadius', 'boxShadow', 'opacity']
const BLOCK_PROPS = ['display', 'position', 'columnGap', 'rowGap', 'marginTop', 'marginBottom', 'textAlign', 'textDecorationLine', 'borderBottomWidth', 'borderBottomColor', 'borderLeftWidth', 'borderLeftColor', 'borderBottomRightRadius', 'outlineWidth', 'outlineColor', 'outlineOffset', 'outlineStyle', 'fill', 'stroke', ...ROOT_PROPS]

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' }

/** A static server. `spa`: an unknown path answers index.html, as vercel.json rewrites it. */
function serve(dir, spa) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
    let file = join(dir, path)
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) {
      if (!spa || path.startsWith('/api/')) { res.writeHead(404).end(); return }
      file = join(dir, 'index.html')
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

async function launch() {
  try { return await chromium.launch() } catch { return chromium.launch({ channel: 'chrome' }) }
}

/** Runs in the page: every variable of the recipe scope. */
const readScope = () => {
  const el = [...document.querySelectorAll('[style*="--color-surface"]')].find((e) => e.style.length > 100)
  if (!el) return null
  const out = {}
  for (const k of el.style) if (k.startsWith('--')) out[k] = el.style.getPropertyValue(k).trim()
  return out
}
const overlayScope = ([stage, vars]) => {
  for (const el of document.querySelectorAll(`${stage} [style*="--color-surface"]`)) {
    if (el.style.length > 100) for (const k in vars) el.style.setProperty(k, vars[k])
  }
}
const readSheet = () => [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => t.includes('data-escala') && t.length > 5000).sort((a, b) => b.length - a.length)[0] ?? ''
const readTree = ([selector, props]) => {
  const root = document.querySelector(selector)
  if (!root) return null
  return [root, ...root.querySelectorAll('*')].flatMap((el) => {
    const c = getComputedStyle(el)
    if (c.display === 'none') return []
    const row = { name: el.tagName.toLowerCase() + (el.dataset.part ? `.${el.dataset.part}` : el.dataset.slot ? `#${el.dataset.slot}` : ''), text: el.children.length ? '' : el.textContent.trim().slice(0, 24), width: el.offsetWidth, height: el.offsetHeight }
    for (const p of props) row[p] = c[p]
    return [row]
  })
}
const readRoot = ([selector, want, props]) => {
  const same = (el) => JSON.stringify(Object.entries({ ...el.dataset, inspect: undefined }).filter(([, v]) => v !== undefined).sort()) === JSON.stringify(Object.entries(want).sort())
  const el = want ? [...document.querySelectorAll(selector)].find(same) : document.querySelector(selector)
  if (!el) return null
  const c = getComputedStyle(el)
  const d = { ...el.dataset }; delete d.inspect
  const out = { data: d, height: el.offsetHeight }
  for (const p of props) out[p] = c[p]
  return out
}

const NO_MOTION = '*,*::before,*::after{transition:none!important;animation:none!important}'

class Pair {
  constructor(context, web, storybook) { this.context = context; this.web = web; this.storybook = storybook }

  static async open(browser, urls) {
    const context = await browser.newContext({ viewport: { width: 1800, height: 1200 }, reducedMotion: 'reduce' })
    await context.route(/fonts\.(googleapis|gstatic)\.com|vercel-(insights|scripts)|\/_vercel\//, (r) => r.abort())
    await context.addInitScript(() => { try { localStorage.setItem('sd-onboarded', '1') } catch { /* a blank page has no storage */ } })
    const pair = new Pair(context, await context.newPage(), await context.newPage())
    pair.urls = urls
    return pair
  }

  async openStory(id, theme, viewport, args = '') {
    await this.storybook.goto(`${this.urls.storybook}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};dimensions:${viewport}${args ? `&args=${args}` : ''}`)
    await this.storybook.waitForSelector('#storybook-root *', { timeout: 45000 })
    await this.storybook.addStyleTag({ content: NO_MOTION })
    await this.storybook.waitForTimeout(250)
  }

  async openWeb(section, selector) {
    await this.web.goto('about:blank')
    await this.web.goto(`${this.urls.web}/?section=${section}`)
    await this.web.waitForSelector(`${STAGE} ${selector}`, { timeout: 45000 })
    await this.web.addStyleTag({ content: NO_MOTION })
    await this.web.waitForTimeout(250)
  }

  async pick(label, value) {
    const trigger = this.web.getByRole('button', { name: new RegExp(`^${label}: `) }).first()
    if (!(await trigger.count())) return false
    if ((await trigger.getAttribute('aria-label')).endsWith(`: ${value}`)) return true
    await trigger.click()
    const option = this.web.getByRole('option', { name: value, exact: true }).first()
    if (!(await option.count())) { await this.web.keyboard.press('Escape'); return false }
    await option.click()
    await this.web.waitForTimeout(200)
    return true
  }

  async stage(theme, viewport) {
    await this.web.getByRole('button', { name: theme === 'dark' ? 'Preview in Dark' : 'Preview in Light', exact: true }).click()
    if (viewport) await this.web.getByRole('button', { name: FRAME[viewport], exact: true }).click()
    await this.web.waitForTimeout(200)
  }

  /** True pixels: a zoomed stage reports scaled borders and rounds text differently. */
  async actualSize() {
    const zoom = this.web.getByRole('button', { name: /^Actual size/ })
    if (await zoom.count()) await zoom.first().click()
    await this.web.waitForTimeout(200)
  }

  async overlay() {
    await this.web.evaluate(overlayScope, [STAGE, await this.storybook.evaluate(readScope)])
    await this.web.waitForTimeout(100)
  }
}

function diffTrees(a, b, props) {
  const out = []
  if (a.length !== b.length) out.push(`element count: storybook ${a.length}, web ${b.length}`)
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].name !== b[i].name) { out.push(`element ${i}: storybook ${a[i].name}, web ${b[i].name}`); break }
    for (const p of ['width', 'height', ...props]) {
      if (String(a[i][p]) !== String(b[i][p])) out.push(`${a[i].name}${a[i].text ? ` "${a[i].text}"` : ''} ${p}: storybook ${String(a[i][p]).slice(0, 80)}, web ${String(b[i][p]).slice(0, 80)}`)
    }
  }
  return out
}

/** The variables that must match as values: everything but the palette and the shadows. */
const comparable = (name) => !name.startsWith('--color-') && !name.startsWith('--social-') && !name.startsWith('--shadow-')

function buildCases(stories) {
  const cases = []
  const add = (name, run) => { if (!ONLY || name.includes(ONLY)) cases.push({ name, run }) }

  add('Recipes/stylesheet', async (p) => {
    await p.openStory('buttons-button--playground', 'light', 'desktop')
    await p.openWeb('components/Button', '[data-escala="Button"]')
    const [a, b] = [await p.storybook.evaluate(readSheet), await p.web.evaluate(readSheet)]
    if (!a) return ['the recipe stylesheet was not found in Storybook']
    return a === b ? [] : [`the recipe stylesheet differs: storybook ${a.length} characters, web ${b.length}`]
  })

  for (const theme of THEMES) for (const viewport of Object.keys(FRAME)) {
    add(`Variables/${theme}/${viewport}`, async (p) => {
      await p.openStory('blocks-auth-signin--playground', theme, viewport)
      await p.openWeb('blocks/Auth/SignIn', '[data-block]')
      await p.stage(theme, viewport)
      const [a, b] = [await p.storybook.evaluate(readScope), await p.web.evaluate(readScope)]
      return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(comparable).filter((k) => a[k] !== b[k]).map((k) => `${k}: storybook ${a[k] ?? 'missing'}, web ${b[k] ?? 'missing'}`)
    })
  }

  const blocks = stories.filter((s) => s.title.startsWith('Blocks/Auth/') && s.name === 'Playground')
  for (const story of blocks) {
    const block = story.title.split('/').pop()
    const compare = async (p, theme, viewport, inline) => {
      await p.openWeb(`blocks/Auth/${block}`, '[data-block]')
      await p.stage(theme, viewport)
      if (inline) {
        if (!(await p.pick('Container', 'plain')) || !(await p.pick('Layout', 'inline'))) return null
      }
      await p.actualSize()
      const width = await p.web.evaluate((s) => document.querySelector(s).offsetWidth, `${STAGE} [data-block]`)
      // Story padding (`layout: padded`, 16 a side) + the scope's own 32 a side: the block gets the width the frame gives it.
      await p.storybook.setViewportSize({ width: viewport === 'desktop' ? 1800 : width + 96, height: 1200 })
      await p.openStory(story.id, theme, viewport, inline ? 'container:plain;layout:inline' : '')
      await p.overlay()
      const a = await p.storybook.evaluate(readTree, ['[data-block]', BLOCK_PROPS])
      const b = await p.web.evaluate(readTree, [`${STAGE} [data-block]`, BLOCK_PROPS])
      await p.storybook.setViewportSize({ width: 1800, height: 1200 })
      if (!a || !b) return [`block not found: storybook ${Boolean(a)}, web ${Boolean(b)}`]
      return diffTrees(a, b, BLOCK_PROPS)
    }
    for (const theme of THEMES) {
      for (const viewport of ['desktop', 'mobile']) add(`Blocks/${block}/stacked/${theme}/${viewport}`, (p) => compare(p, theme, viewport, false))
      if (!['SignInPasskey', 'Split'].includes(block)) add(`Blocks/${block}/inline/${theme}/desktop`, (p) => compare(p, theme, 'desktop', true))
    }
  }

  const index = JSON.parse(readFileSync(join(ROOT, 'spec/contracts/index.json'), 'utf8'))
  const known = new Set(stories.map((s) => s.id))
  // A screen's pieces (SettingsRow, IssueCard…) have no Elements page on the web: they are drawn on their screen's
  // page in the Screens tab, the way Storybook merges them into `Screens/<screen>` (spec/storybook-families.json).
  const { families } = JSON.parse(readFileSync(join(ROOT, 'spec/storybook-families.json'), 'utf8'))
  const screenPieces = new Set(families.filter((f) => f.folder === 'Screens').flatMap((f) => [f.root, ...f.parts]).filter(Boolean))
  for (const { key, story } of index) {
    if (!story || !known.has(story) || screenPieces.has(key)) continue
    for (const theme of THEMES) {
      add(`Components/${key}/${theme}`, async (p) => {
        const selector = `[data-escala="${key}"]`
        await p.openStory(story, theme, 'desktop')
        const a = await p.storybook.evaluate(readRoot, [`#storybook-root ${selector}`, null, ROOT_PROPS])
        if (!a) return [`${key} is not drawn by its story ${story}`]
        await p.openWeb(`components/${key}`, selector)
        await p.stage(theme)
        await p.actualSize()
        const scoped = `${STAGE} ${selector}`
        let found = await p.web.evaluate(readRoot, [scoped, a.data, ROOT_PROPS])
        if (!found) {
          for (const [prop, value] of Object.entries(a.data)) await p.pick(prop[0].toUpperCase() + prop.slice(1), value)
          await p.actualSize()
          found = await p.web.evaluate(readRoot, [scoped, a.data, ROOT_PROPS])
        }
        if (!found) return [`no-match: the web does not draw ${key} with ${JSON.stringify(a.data)}`]
        await p.overlay()
        const b = await p.web.evaluate(readRoot, [scoped, a.data, ROOT_PROPS])
        const out = ROOT_PROPS.filter((k) => a[k] !== b[k]).map((k) => `${k}: storybook ${String(a[k]).slice(0, 80)}, web ${String(b[k]).slice(0, 80)}`)
        if (a.height !== b.height) out.push(`height: storybook ${a.height}, web ${b.height}`)
        return out
      })
    }
  }
  return cases
}

/** Takes off what an exception allows, and records that the exception was needed. */
function applyException(name, problems, used) {
  const [group, key] = name.split('/')
  const rule = group === 'Components' ? EXCEPTIONS[key] : null
  if (!rule) return problems
  const left = problems.filter((p) => !rule.ignore.some((allowed) => p.startsWith(`${allowed}:`)))
  if (left.length < problems.length) used.add(key)
  return left
}

async function main() {
  for (const [label, dir, file] of [['web', WEB_DIR, 'index.html'], ['storybook', STORYBOOK_DIR, 'iframe.html']]) {
    if (!existsSync(join(dir, file))) { console.error(`No ${label} build at ${dir}. Build it first (vite build · npm run build-storybook).`); process.exit(2) }
  }
  const [web, storybook] = [await serve(WEB_DIR, true), await serve(STORYBOOK_DIR, false)]
  const urls = { web: web.url, storybook: storybook.url }
  const stories = Object.values(JSON.parse(readFileSync(join(STORYBOOK_DIR, 'index.json'), 'utf8')).entries).filter((e) => e.type === 'story')
  const cases = buildCases(stories)
  const browser = await launch()
  const failures = []
  const used = new Set()
  let next = 0
  let done = 0

  const worker = async () => {
    let pair = await Pair.open(browser, urls)
    while (next < cases.length) {
      const item = cases[next++]
      let problems = []
      // A second attempt: one slow page must not read as a difference.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          problems = applyException(item.name, (await item.run(pair)) ?? [], used)
          if (!problems.length) break
        } catch (error) {
          problems = [`could not measure: ${String(error.message).split('\n')[0].slice(0, 180)}`]
          await pair.context.close().catch(() => {})
          pair = await Pair.open(browser, urls)
        }
      }
      if (problems.length) failures.push({ name: item.name, problems })
      done += 1
      if (done % 25 === 0 || done === cases.length) console.log(`${done}/${cases.length} compared, ${failures.length} with differences`)
    }
    await pair.context.close().catch(() => {})
  }
  await Promise.all(Array.from({ length: WORKERS }, worker))
  await browser.close()
  web.server.close(); storybook.server.close()

  const stale = ONLY ? [] : Object.keys(EXCEPTIONS).filter((k) => !used.has(k))
  mkdirSync(dirname(REPORT), { recursive: true })
  writeFileSync(REPORT, `${JSON.stringify({ cases: cases.length, failures, staleExceptions: stale }, null, 2)}\n`)

  for (const f of failures.sort((a, b) => a.name.localeCompare(b.name))) {
    console.error(`\n✗ ${f.name}`)
    for (const p of f.problems.slice(0, 8)) console.error(`  ${p}`)
    if (f.problems.length > 8) console.error(`  … and ${f.problems.length - 8} more`)
  }
  for (const k of stale) console.error(`\n✗ spec/web-storybook-parity.exceptions.json: "${k}" no longer differs. Remove the exception.`)
  if (failures.length || stale.length) {
    console.error(`\nThe web and Storybook differ: ${failures.length} of ${cases.length} cases, ${stale.length} stale exceptions.`)
    process.exit(1)
  }
  console.log(`The web and Storybook match: ${cases.length} cases.`)
}

main().catch((error) => { console.error(error); process.exit(2) })
