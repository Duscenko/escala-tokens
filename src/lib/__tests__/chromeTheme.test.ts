import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluate, wcagRatio } from '../color/apca'
import { CHROME_ROLES, resolveChromeTheme } from '../chromeTheme'

const root = resolve(__dirname, '../../..')
const generated = resolve(root, 'src/lib/chromeTheme.generated.css')
const theme = resolveChromeTheme()

describe('chrome theme mapping', () => {
  it('reads panel elevation from the platform foundations', () => {
    expect(CHROME_ROLES['--app']).toBe('surface.page')
    expect(CHROME_ROLES['--nav']).toBe('surface.page')
    expect(CHROME_ROLES['--side-panel']).toBe('surface.layer-2')
    expect(CHROME_ROLES['--surface']).toBe('surface.layer-1')
    expect(CHROME_ROLES['--line']).toBe('border.subtle')
    expect(Object.keys(CHROME_ROLES)).not.toContain('--fg-faint')
  })

  it('resolves every mapped var to a real colour in both appearances', () => {
    for (const name of Object.keys(CHROME_ROLES)) {
      expect(theme.vars.light[name]).toMatch(/^#/)
      expect(theme.vars.dark[name]).toMatch(/^#/)
    }
    expect(theme.vars.light['--line-alpha']).toBe(theme.vars.light['--line'])
    expect(theme.vars.dark['--line-alpha']).toBe(theme.vars.dark['--line'])
  })

  it('regenerating produces the committed file byte-for-byte', () => {
    const before = readFileSync(generated, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-chrome-theme.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(generated, 'utf8')).toBe(before)
  }, 60_000)

  it('index.css no longer hand-tunes a generated variable', () => {
    const index = readFileSync(resolve(root, 'src/index.css'), 'utf8')
    for (const name of Object.keys(CHROME_ROLES)) {
      expect(index).not.toMatch(new RegExp(`^\\s*${name}\\s*:`, 'm'))
    }
    expect(index).toMatch(/--fg-faint:\s*#737373/)
    expect(index).toMatch(/--fg-faint:\s*#7b7b83/)
  })
})

describe('chrome contrast (platform foundations)', () => {
  const v = (a: 'light' | 'dark', name: string) => theme.vars[a][name]

  it('primary ink clears body text on page, rows and panels in both appearances', () => {
    for (const a of ['light', 'dark'] as const) {
      for (const bg of ['--app', '--surface', '--side-panel']) {
        expect(evaluate(v(a, '--fg'), v(a, bg), 'body-text').passesWcag).toBe(true)
      }
    }
  })

  it('dark: muted ink clears body text on every level — the reason for the migration', () => {
    for (const bg of ['--app', '--surface', '--side-panel']) {
      // ~10.3–11.5:1 (was 6.72). APCA lands Lc 74–75, a hair under the body row.
      expect(evaluate(v('dark', '--fg-muted'), v('dark', bg), 'body-text').passesWcag).toBe(true)
      expect(wcagRatio(v('dark', '--fg-muted'), v('dark', bg))).toBeGreaterThan(10)
    }
  })

  it.fails('light: muted ink on a panel (surface.layer-2) clears WCAG AA', () => {
    // KNOWN DEFECT in the light foundations: content.secondary #67676a on
    // surface.layer-2 #cfd0d2 measures 3.65:1. Fix it in the platform
    // system (lighter layer-2, or a darker content.secondary), re-export,
    // regenerate — then drop the `.fails`.
    expect(wcagRatio(v('light', '--fg-muted'), v('light', '--side-panel'))).toBeGreaterThanOrEqual(4.5)
  })
})
