// Regenerates the screenshots the About page shows (public/about/*.webp).
//
//   npm run dev                      # in another terminal
//   npm run about:shots              # all of them
//   npm run about:shots -- semantics # only the ones whose name matches
//
// The About page IS the guide to the generator, so these are captured from the
// real app rather than drawn: dark chrome, the default system (Core, the
// seeded theme), 1440×900 at 2×. Re-run it whenever the interface changes and
// the guide follows. Each shot declares the ratio of the slot it fills in
// `AboutMenu.tsx`, so nothing is stretched or letterboxed there.
//
// Env: BASE_URL (default http://localhost:5173) · CHROMIUM (path to a Chromium
// / Chrome executable; defaults to the newest one in Playwright's cache).

import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
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
// Layout (2026-10): [icon rail 64] [canvas CARD] [INSPECTOR 288] — the inspector
// holds the tabs Theme · Variables · Code · Docs. Docs is no longer a canvas
// button: it is an inspector tab that shows the page of the rail's foundation.
const inspectorTab = (p, name) => p.getByRole('tab', { name, exact: true }).click()
const rail = (p, name) => p.locator(`nav button:has-text("${name}")`).first()
const settle = (p, ms = 700) => p.waitForTimeout(ms)
const blur = (p) => p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())

/** The Theme board opens in inspect mode; shots want the plain board. */
async function stopInspecting(p) {
  await p.getByRole('button', { name: 'Stop inspecting' }).click().catch(() => {})
  await settle(p, 400)
}
async function openVariables(p, foundation) {
  // The rail lists every foundation only outside Theme, so switch tab first.
  await inspectorTab(p, 'Variables')
  await settle(p, 500)
  if (foundation) await rail(p, foundation).click()
  await settle(p)
}
async function openDocs(p, foundation) {
  // Docs' own rail is the short one; pick the foundation from Variables' full
  // rail, then flip to Docs — the page follows the selected foundation.
  await inspectorTab(p, 'Variables')
  await settle(p, 500)
  await rail(p, foundation).click()
  await settle(p, 400)
  await inspectorTab(p, 'Docs')
  await settle(p, 900)
}
async function openPreview(p, foundation) {
  await inspectorTab(p, 'Theme')
  await settle(p, 500)
  if (foundation) await rail(p, foundation).click()
  await stopInspecting(p)
  await settle(p)
}

const TOP = 66
const LEFT = 65
/** The canvas card, measured: from the icon rail to the inspector's left edge.
 *  `maxW` keeps a 4:3 crop inside the card's own height. */
async function card(p, maxW = 1040) {
  const i = await p.locator('#workspace-inspector').boundingBox()
  return { x: LEFT, y: TOP, width: Math.min(maxW, Math.floor(i.x - 14 - LEFT)) }
}
/** Card + inspector, for the 16:10 shots (the inspector is half the story). */
const WIDE = { x: 60, y: 54, width: 1370 }
/** A 1200px window: wide tables compact, so a 4:3 crop fills instead of leaving
 *  a dead band under a table that only has twelve rows. */
const NARROW = { width: 1200, height: 940 }

/** A shot: where it goes, its slot ratio, how to reach the state, what to crop. */
const SHOTS = [
  {
    name: 'system-styles', ratio: '4:3',
    async setup(p) {
      await p.locator('button[aria-label^="Theme:"]').click()
      await settle(p, 900)
      await p.locator('[role=dialog] [role=radio][aria-label="Glass"]').click()
      await settle(p)
      return { x: 240, y: 0, width: 1200 }
    },
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
      await openPreview(p, 'Color')
      await p.locator('button:has-text("Show")').first().click()
      await settle(p, 900)
      return card(p)
    },
  },
  {
    name: 'type', ratio: '16:10',
    async setup(p) { await openPreview(p, 'Font'); return WIDE },
  },
  {
    name: 'radius', ratio: '16:10',
    async setup(p) {
      await openPreview(p, 'Radius')
      // The About copy's point: Fields go as round as they can while Boxes stay put —
      // a pill button never turns the cards into stadiums. The last tile of the
      // Fields row, in the inspector (by position: the tiles carry no accessible name).
      await p.mouse.click(1394, 389)
      await settle(p, 600)
      return WIDE
    },
  },
  {
    name: 'spacing', ratio: '4:3',
    async setup(p) {
      await openVariables(p, 'Spacing')
      await p.locator('button:has-text("Spacing responsive")').first().click()
      await settle(p, 500)
      // Platform switch (inspector): Desktop · Tablet · Mobile — pick the last.
      await p.locator('#workspace-inspector [aria-label*="latform"] button, #workspace-inspector [role=radiogroup] button').last().click().catch(() => {})
      await settle(p)
      return card(p)
    },
  },
  // ── The four destinations: what the tokens become ──
  {
    name: 'components', ratio: '16:10', viewport: { width: 1440, height: 960 },
    async setup(p) {
      await p.getByRole('button', { name: 'Components', exact: true }).first().click()
      await settle(p, 1200)
      return { x: 0, y: 52, width: 1400 }
    },
  },
  {
    name: 'docs', ratio: '16:10',
    async setup(p) {
      await inspectorTab(p, 'Docs')
      await settle(p, 1200)
      return WIDE
    },
  },
  {
    name: 'code', ratio: '16:10',
    async setup(p) {
      await inspectorTab(p, 'Code')
      await settle(p, 1200)
      return WIDE
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
      // picture within weeks; the guide shows the page without it.
      await p.getByText(/is free until/).first().evaluate((el) => {
        let n = el
        while (n.parentElement && n.getBoundingClientRect().width < 700) n = n.parentElement
        n.style.display = 'none'
      })
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
    await p.mouse.click(p.viewportSize().width - 28, 14) // banner ✕, right-aligned
    await settle(p, 400)
    const crop = await shot.setup(p)
    if (process.env.DEBUG_SHOTS) await p.screenshot({ path: `/private/tmp/claude-502/-Users-duscenko-sync-ds-platform-escala-tokens/082f8afb-4457-4f25-ab8c-be627cbc8a27/scratchpad/dbg-${shot.name}-${appearance}.png` })
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
