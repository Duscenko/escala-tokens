// Regenerates the screenshots the About page shows (public/about/*.webp).
//
//   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 5183   # accounts OFF
//   npm run about:shots              # all of them
//   npm run about:shots -- semantics # only the ones whose name matches
//
// The About page IS the guide to the generator, so these are captured from the
// real app rather than drawn: dark chrome, the default system (Core, the
// seeded theme), 1440×900 at 2×. Re-run it whenever the interface changes and
// the guide follows. Each shot declares the ratio of the slot it fills in
// `AboutMenu.tsx`, so nothing is stretched or letterboxed there.
//
// Accounts must be off (the `Vite Dev (accounts off)` launch config) so Variables,
// System and Docs aren't behind the sign-up wall. DEBUG_SHOTS=<dir> also saves
// the uncropped frame of each shot there.
//
// Env: BASE_URL (default http://localhost:5183) · CHROMIUM (path to a Chromium
// / Chrome executable; defaults to the newest one in Playwright's cache).

import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5183'
const OUT = new URL('../public/about/', import.meta.url).pathname
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'))
/** Width of the stored file. The slots render ≤ 640 CSS px wide, so this is
 *  2× for sharp text on retina without shipping the 2880px capture. */
const OUT_WIDTH = { '16:10': 1360, '4:3': 1200, '1:1': 1000 }
/** Per-file budget. Quality steps down until a shot fits. */
const MAX_BYTES = 150 * 1024

async function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of (await readdir(cache)).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-win/chrome.exe']) {
        const p = join(cache, dir, rel)
        if (existsSync(p)) return p
      }
    }
  }
  throw new Error('No Chromium found. Set CHROMIUM=/path/to/chrome')
}

// ── helpers ────────────────────────────────────────────────────────────────
// Layout (2026-10, brands & themes): [icon rail] [canvas CARD] [INSPECTOR 288].
// The inspector's tabs are Brand · Variables · System. Code is the `</>` button
// in the canvas header; Docs is a page of System; Components and Figma sync are
// reached from the header menu / Export menu.
const inspectorTab = (p, name) => p.getByRole('tab', { name, exact: true }).click()
const rail = (p, name) => p.locator(`nav button:has-text("${name}")`).first()
const settle = (p, ms = 700) => p.waitForTimeout(ms)
const blur = (p) => p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())

async function openBrand(p, edition) {
  await inspectorTab(p, 'Brand')
  await settle(p, 500)
  // The board opens in inspect mode; shots want the plain board.
  await p.getByRole('button', { name: 'Exit inspector' }).click({ timeout: 1000 }).catch(() => {})
  await settle(p, 300)
  if (edition) await rail(p, edition).click()
  await settle(p)
}
async function openVariables(p, foundation) {
  await inspectorTab(p, 'Variables')
  await settle(p, 500)
  if (foundation) await rail(p, foundation).click()
  await settle(p)
}

const TOP = 66
const LEFT = 65
/** The canvas card, measured: from the icon rail to the inspector's left edge.
 *  `maxW` keeps a 4:3 crop inside the card's own height. */
async function card(p, maxW = 1062) {
  const i = await p.locator('#workspace-inspector').boundingBox()
  return { x: LEFT, y: TOP, width: Math.min(maxW, Math.floor(i.x - 14 - LEFT)) }
}
/** Card + inspector, for the 16:10 shots (the inspector is half the story). */
const WIDE = { x: 60, y: 52, width: 1370 }
/** System pages and Code have no icon rail: their card starts at the left edge. */
const FULL = { x: 12, y: 50, width: 1416 }

/** A shot: where it goes, its slot ratio, how to reach the state, what to crop. */
const SHOTS = [
  {
    name: 'system-styles', ratio: '4:3',
    // The workspace opens with a System Style tried on (Glass): its overview in
    // the inspector — palette, font, radius, icon weight — is the picture.
    async setup() { return { x: 592, y: 56, width: 848 } },
  },
  {
    name: 'primitives', ratio: '16:10',
    async setup(p) { await openVariables(p, 'Color'); return WIDE },
  },
  {
    name: 'semantics', ratio: '16:10',
    async setup(p) {
      await openVariables(p, 'Color')
      await p.getByText('Color semantics', { exact: true }).first().click()
      await settle(p)
      // The row's sliders icon (far-right column of the card) opens Token Details.
      const row = await p.getByText('action.primary.default', { exact: true }).first().boundingBox()
      await p.mouse.click(1099, row.y + row.height / 2)
      await settle(p, 900)
      return WIDE
    },
  },
  {
    name: 'contrast', ratio: '4:3',
    async setup(p) {
      await openBrand(p, 'Color')
      await p.getByRole('button', { name: /Contrast grid/ }).click()
      await settle(p, 900)
      return card(p)
    },
  },
  {
    name: 'type', ratio: '16:10',
    async setup(p) { await openBrand(p, 'Font'); return WIDE },
  },
  {
    name: 'radius', ratio: '16:10',
    async setup(p) {
      await openBrand(p, 'Radius')
      // The About copy's point: Fields go as round as they can while Boxes stay put —
      // a pill button never turns the cards into stadiums.
      await p.getByRole('button', { name: /^Boxes radius 2xl/ }).click()
      await p.getByRole('button', { name: /^Fields radius 4xl/ }).click()
      await settle(p, 600)
      return WIDE
    },
  },
  {
    name: 'spacing', ratio: '4:3',
    async setup(p) {
      await openVariables(p, 'Spacing')
      // Responsive now lives inside the roles ("Steps down on smaller screens");
      // the Platform switch (inspector) is Desktop · Tablet · Mobile — pick the last.
      await p.locator('xpath=//*[@id="workspace-inspector"]//*[normalize-space()="Platform"][not(*)]/following::button[3]').click()
      await settle(p, 700)
      return card(p)
    },
  },
  // ── The four destinations: what the tokens become ──
  {
    name: 'components', ratio: '16:10', viewport: { width: 1440, height: 960 },
    async setup(p) {
      await p.goto(BASE + '/components', { waitUntil: 'networkidle' })
      await settle(p, 1500)
      // The index is a list; the guide shows a component's own page (the playground).
      await p.getByText('Button', { exact: true }).first().click()
      await settle(p, 1500)
      return { x: 0, y: 52, width: 1400 }
    },
  },
  {
    name: 'docs', ratio: '16:10',
    async setup(p) {
      await inspectorTab(p, 'System')
      await settle(p, 600)
      await p.getByRole('button', { name: 'Docs', exact: true }).click()
      await settle(p, 1200)
      return FULL
    },
  },
  {
    name: 'code', ratio: '16:10',
    async setup(p) {
      await p.getByRole('button', { name: 'Get code' }).first().click()
      await settle(p, 1200)
      return FULL
    },
  },
  {
    name: 'figma', ratio: '16:10', viewport: { width: 1440, height: 990 },
    async setup(p) {
      await p.getByRole('button', { name: 'More export destinations' }).click()
      await settle(p, 400)
      await p.getByText('Sync Figma', { exact: true }).click()
      await settle(p, 1200)
      // The launch-promo strip ("free until October 31 · N days left") dates the
      // picture within weeks; the guide shows the page without it (when it exists).
      await p.getByText(/is free until|Escala Pro is/).first().evaluate((el) => {
        let n = el
        while (n.parentElement && n.getBoundingClientRect().width < 700) n = n.parentElement
        n.style.display = 'none'
      }).catch(() => {})
      await settle(p, 300)
      return { x: 0, y: 54, width: 1440 }
    },
  },
]

async function encode(png, ratio, name) {
  const width = OUT_WIDTH[ratio]
  let quality = 92
  let buf
  for (; quality >= 60; quality -= 4) {
    buf = await sharp(png).resize({ width }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer()
    if (buf.length <= MAX_BYTES) break
  }
  const meta = await sharp(buf).metadata()
  await writeFile(join(OUT, `${name}.webp`), buf)
  return { bytes: buf.length, quality, w: meta.width, h: meta.height }
}

/** One capture: a fresh context (no state leaks between shots; the app seeds
 *  the same Core theme every time), the plugin banner closed so every shot
 *  starts from the same top edge, then the shot's own steps and crop. */
async function capture(browser, shot, appearance) {
  const ctx = await browser.newContext({ viewport: shot.viewport ?? { width: 1440, height: 940 }, deviceScaleFactor: 2, colorScheme: appearance })
  await ctx.addInitScript((mode) => {
    localStorage.setItem('sd-onboarded', '1')
    localStorage.setItem('sd-theme', mode)
  }, appearance)
  const p = await ctx.newPage()
  try {
    await p.goto(BASE + '/', { waitUntil: 'networkidle' })
    await settle(p, 1200)
    // Every shot starts from the same workspace: setup wizard skipped (if shown),
    // promo strip closed (if shown), and the tried-on style added as a design system
    // so Variables and System unlock — except the System-style shot, which wants
    // the try-on overview itself.
    await p.getByRole('button', { name: 'Skip setup' }).click({ timeout: 1500 }).catch(() => {})
    await p.getByRole('button', { name: 'Dismiss promo announcement' }).click({ timeout: 1000 }).catch(() => {})
    await settle(p, 500)
    if (shot.name !== 'system-styles' && shot.name !== 'components') {
      await p.getByRole('button', { name: 'Add design system' }).click({ timeout: 3000 }).catch(() => {})
      await settle(p, 1000)
    }
    const crop = await shot.setup(p)
    if (process.env.DEBUG_SHOTS) await p.screenshot({ path: join(process.env.DEBUG_SHOTS, `dbg-${shot.name}-${appearance}.png`) })
    await blur(p)
    const [rw, rh] = shot.ratio.split(':').map(Number)
    // A composed shot gives each part an explicit height; otherwise the slot's ratio.
    const height = crop.height ?? Math.round((crop.width * rh) / rw)
    return await p.screenshot({ clip: { x: crop.x, y: crop.y, width: crop.width, height }, animations: 'disabled' })
  } finally {
    await ctx.close()
  }
}

/** Stack captures top to bottom into one image. */
async function stack(parts) {
  const metas = await Promise.all(parts.map((b) => sharp(b).metadata()))
  const width = Math.max(...metas.map((m) => m.width))
  const height = metas.reduce((n, m) => n + m.height, 0)
  let top = 0
  const layers = parts.map((input, i) => { const l = { input, left: 0, top }; top += metas[i].height; return l })
  return sharp({ create: { width, height, channels: 3, background: '#000' } }).composite(layers).png().toBuffer()
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: await findChromium() })
  const results = []
  for (const shot of SHOTS) {
    if (ONLY.length && !ONLY.some((o) => shot.name.includes(o))) continue
    try {
      const parts = []
      for (const appearance of shot.appearances ?? ['dark']) {
        parts.push(await capture(browser, shot, appearance))
      }
      const png = parts.length === 1 ? parts[0] : await stack(parts)
      results.push({ name: shot.name, ...(await encode(png, shot.ratio, shot.name)) })
    } catch (e) {
      console.error(`✗ ${shot.name}: ${e.message.split('\n')[0]}`)
    }
  }
  await browser.close()
  for (const r of results) {
    console.log(`✓ ${r.name.padEnd(14)} ${r.w}×${r.h}  ${(r.bytes / 1024).toFixed(0)} KB  q${r.quality}`)
  }
  if (results.length) {
    const total = results.reduce((n, r) => n + r.bytes, 0)
    console.log(`  ${results.length} files, ${(total / 1024).toFixed(0)} KB total → public/about/`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
