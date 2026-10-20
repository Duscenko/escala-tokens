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
// Layout (2026-10-20): [icon rail: Home · Board · Variables · Code · Components]
// [canvas CARD] [INSPECTOR 288]. A fresh browser has NO brand, so every capture
// first adds one through the real flow (`seedBrand`) — no fixture to go stale
// with store migrations. Crops are MEASURED off the live layout, never typed.
const settle = (p, ms = 700) => p.waitForTimeout(ms)
const blur = (p) => p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
/** A tile of the left icon rail. */
// Visible only: the top nav carries hidden copies of some names (Components).
const rail = (p, name) => p.getByRole('button', { name, exact: true }).filter({ visible: true }).first()
/** A control inside the right inspector. */
const inspector = (p) => p.locator('#workspace-inspector')

async function seedBrand(p) {
  await p.goto(BASE + '/?section=system', { waitUntil: 'networkidle' })
  await settle(p, 1000)
  await p.getByRole('button', { name: 'Add brand' }).last().click()
  await settle(p, 400)
  await p.getByText('Start from blank', { exact: true }).click()
  await settle(p, 400)
  await p.getByText('Blank', { exact: true }).click()
  await settle(p, 1200)
  await p.getByRole('button', { name: 'Continue', exact: true }).click()
  await settle(p, 800)
  await p.getByRole('button', { name: 'Save', exact: true }).click()
  await settle(p, 1200)
}

async function openBoard(p, row) {
  await rail(p, 'Board').click()
  await settle(p, 700)
  // The board opens in inspect mode; shots want the plain board.
  await p.getByRole('button', { name: 'Exit inspector' }).click({ timeout: 1000 }).catch(() => {})
  await settle(p, 300)
  if (row) {
    await inspector(p).getByRole('button', { name: new RegExp(`^${row}\\b`) }).first().click()
    await settle(p)
  }
}
async function openVariables(p, foundation) {
  await rail(p, 'Variables').click()
  await settle(p, 700)
  if (foundation) await inspector(p).getByRole('tab', { name: foundation, exact: true }).first().click()
  await settle(p)
}

/** The canvas card and the inspector, measured. */
async function layout(p) {
  const card = await p.locator('main main').first().boundingBox()
  const ins = await inspector(p).boundingBox()
  return { card, ins }
}
/** The canvas card alone (4:3 shots). */
async function cardCrop(p) {
  const { card } = await layout(p)
  return { x: Math.round(card.x - 6), y: Math.round(card.y - 6), width: Math.round(card.width + 12) }
}
/** Card + inspector (16:10 shots — the inspector is half the story). */
async function wideCrop(p) {
  const { card, ins } = await layout(p)
  const x = Math.round(card.x - 6)
  return { x, y: Math.round(card.y - 6), width: Math.round(ins.x + ins.width + 6 - x) }
}

/** A shot: where it goes, its slot ratio, how to reach the state, what to crop. */
const SHOTS = [
  {
    name: 'primitives', ratio: '16:10',
    async setup(p) { await openVariables(p); return wideCrop(p) },
  },
  {
    name: 'semantics', ratio: '16:10',
    async setup(p) {
      await openVariables(p)
      await inspector(p).getByRole('button', { name: 'Color semantics', exact: true }).click()
      await settle(p)
      // The row's sliders icon opens Token Details.
      await p.getByRole('button', { name: 'Edit action.primary.default scale' }).click()
      await settle(p, 900)
      return wideCrop(p)
    },
  },
  {
    name: 'contrast', ratio: '4:3',
    async setup(p) {
      await openBoard(p)
      await inspector(p).getByRole('button', { name: /Contrast grid/ }).click()
      await settle(p, 900)
      return cardCrop(p)
    },
  },
  {
    name: 'type', ratio: '16:10',
    async setup(p) { await openBoard(p, 'Font'); return wideCrop(p) },
  },
  {
    name: 'radius', ratio: '16:10',
    async setup(p) {
      await openBoard(p, 'Radius')
      // Fine-tune shows the three axes — Boxes · Fields · Selectors — the About copy's point.
      await inspector(p).getByRole('button', { name: /^Show/ }).first().click({ timeout: 2000 }).catch(() => {})
      await settle(p, 600)
      return wideCrop(p)
    },
  },
  {
    name: 'spacing', ratio: '4:3',
    async setup(p) {
      await openVariables(p, 'Spacing')
      await inspector(p).getByRole('button', { name: 'Mobile', exact: true }).first().click({ timeout: 2000 }).catch(() => {})
      await settle(p, 700)
      return cardCrop(p)
    },
  },
  // ── The four destinations: what the tokens become ──
  {
    name: 'components', ratio: '16:10',
    async setup(p) {
      await rail(p, 'Components').click()
      await settle(p, 1200)
      // A component's own page (the playground), not the index.
      await p.locator('li').filter({ has: p.getByText('Button', { exact: true }) }).first().click()
      await settle(p, 1500)
      // Components' right panel is its own directory, not #workspace-inspector:
      // crop from the icon rail's edge to the window's.
      return { x: 74, y: 54, width: 1440 - 8 - 74 }
    },
  },
  {
    name: 'docs', ratio: '16:10',
    async setup(p) {
      await rail(p, 'Home').click()
      await settle(p, 700)
      await inspector(p).getByRole('button', { name: 'Docs', exact: true }).click()
      await settle(p, 600)
      await inspector(p).getByRole('button', { name: 'Color', exact: true }).first().click({ timeout: 2000 }).catch(() => {})
      await settle(p, 1200)
      return wideCrop(p)
    },
  },
  {
    name: 'code', ratio: '16:10',
    async setup(p) {
      await rail(p, 'Code').click()
      await settle(p, 1200)
      return wideCrop(p)
    },
  },
  {
    name: 'figma', ratio: '16:10',
    async setup(p) {
      await p.getByRole('button', { name: /^Export/ }).first().click()
      await settle(p, 400)
      await p.getByText('Sync with Figma', { exact: true }).click()
      await settle(p, 1500)
      return wideCrop(p)
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
    await seedBrand(p)
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
