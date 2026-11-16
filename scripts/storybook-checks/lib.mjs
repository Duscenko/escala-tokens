// Shared by the Storybook checks (Sheet, AuthSignInPhone): a headless Chromium, a story URL, a summary printer.
// Needs Storybook running (`npm run storybook`, port 6006; BASE_URL overrides). Run: node scripts/storybook-checks/<check>.mjs
import { readdir, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

export const BASE = process.env.BASE_URL ?? 'http://localhost:6006'
export const story = (id, globals = '') => `${BASE}/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ''}`

async function findChromium() {
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  try {
    for (const dir of (await readdir(cache)).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome']) {
        const p = join(cache, dir, rel)
        try { await access(p); return p } catch { /* next */ }
      }
    }
  } catch { /* no cache */ }
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
}

export async function launch() {
  return chromium.launch({ executablePath: await findChromium() })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Collects pass / fail lines; prints them and exits 1 when anything failed. */
export function checker(title) {
  const rows = []
  const check = (ok, what, detail = '') => { rows.push({ ok, what, detail }); console.log(`${ok ? '✓' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`) }
  const done = () => {
    const bad = rows.filter((r) => !r.ok)
    console.log(`\n${title}: ${rows.length - bad.length}/${rows.length} passed`)
    if (bad.length) process.exitCode = 1
  }
  return { check, done }
}
