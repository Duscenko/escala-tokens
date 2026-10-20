import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluate, wcagRatio } from '../color/apca'
import { CHROME_ROLES, chromeRoleFor, resolveChromeTheme } from '../chromeTheme'

const root = resolve(__dirname, '../../..')
const generated = resolve(root, 'src/lib/chromeTheme.generated.css')
const theme = resolveChromeTheme()

describe('chrome theme mapping', () => {
  it('reads panel elevation from the platform foundations', () => {
    // Dark reads the roles; light is the hand-set cool ladder: white surfaces
    // on a #f8f9fc canvas, header + rail one step darker.
    expect(chromeRoleFor('--app', 'dark')).toBe('surface.page')
    expect(chromeRoleFor('--nav', 'dark')).toBe('surface.page')
    expect(chromeRoleFor('--canvas', 'dark')).toBe('surface.page')
    expect(chromeRoleFor('--side-panel', 'dark')).toBe('surface.layer-2')
    expect(theme.vars.light['--app']).toBe('#ffffff')
    expect(theme.vars.light['--side-panel']).toBe('#ffffff')
    expect(theme.vars.light['--canvas']).toBe('#f8f9fc')
    expect(theme.vars.light['--nav']).toBe('#f1f3f9')
    expect(theme.vars.light['--line']).toBe('#e2e8f0')
    expect(CHROME_ROLES['--surface']).toBe('surface.layer-1')
    expect(chromeRoleFor('--line', 'dark')).toBe('border.subtle')
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
    expect(index).toMatch(/--fg-faint:\s*#6a6a70/)
    expect(index).toMatch(/--fg-faint:\s*#85858d/)
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

  it('light: muted ink clears WCAG AA on every chrome level', () => {
    // 2026-10-19: layer-1 #e4e5e6 → #eceef0, layer-2 #cfd0d2 → #e1e3e6 and
    // content.secondary #67676a → #616164. Before, muted ink measured 4.47
    // on a row and 3.65 on layer-2 (the inspector panel and every
    // selected / hovered `bg-elevated` fill).
    for (const bg of ['--app', '--surface', '--elevated', '--side-panel', '--chrome-control']) {
      expect(wcagRatio(v('light', '--fg-muted'), v('light', bg))).toBeGreaterThanOrEqual(4.5)
    }
  })
})
