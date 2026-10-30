import { beforeAll, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../tokenGenerator'
import { captureCodeSnapshot } from '../codeScope'
import { buildCSS } from '../exporters'
import { brandContext, pluginPayload } from '../contextSource'
import { buildSectionExport } from '../sectionExport'

// Code tab, agent context and the plugin payload are three readings of ONE
// brand. This holds them to the same values, on a system where brands share
// seed colours (Enterprise / Playful / Luxury / Swiss): Swiss's error, warning
// and info seeds equal the others', which once made it borrow their families,
// solved on THEIR paper — in Figma its critical surface read orange.

type Arch = Record<string, Record<string, Record<string, string>>>
const norm = (h: string) => h.toLowerCase().replace(/^#([0-9a-f]{6})ff$/, '#$1')

/** Effective custom properties: `:root`, then `.dark` when asked. Last wins. */
function cssEnv(css: string, dark: boolean): Map<string, string> {
  const out = new Map<string, string>()
  let selector: string | null = null
  for (const raw of css.split('\n')) {
    const line = raw.trim()
    if (line.endsWith('{')) { selector = line.slice(0, -1).trim(); continue }
    if (line === '}') { selector = null; continue }
    const m = line.match(/^(--[\w-]+)\s*:\s*(.*);$/)
    if (!m) continue
    if (selector === ':root' || (dark && selector?.startsWith('.dark'))) out.set(m[1], m[2])
  }
  return out
}

/** `--name` declared twice in one block with two values. */
function contradictions(css: string): string[] {
  const out: string[] = []
  let seen = new Map<string, string>()
  let selector = ''
  for (const raw of css.split('\n')) {
    const line = raw.trim()
    if (line.endsWith('{')) { selector = line; seen = new Map(); continue }
    const m = line.match(/^(--[\w-]+)\s*:\s*(.*);$/)
    if (!m) continue
    const prev = seen.get(m[1])
    if (prev !== undefined && prev !== m[2]) out.push(`${selector} ${m[1]}: ${prev} | ${m[2]}`)
    seen.set(m[1], m[2])
  }
  return out
}

const brands: string[] = []
beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  for (const id of ['enterprise-dense', 'playful-candy', 'luxury-noir', 'swiss-grid']) {
    const preset = THEME_STYLE_PRESETS.find((p) => p.id === id)
    if (!preset) throw new Error(`missing preset ${id}`)
    const r = adoptPreset(preset, 'light')
    if ('error' in r) throw new Error(r.error)
    brands.push(r.key)
  }
})

describe('Code · CSS, Agent context and the plugin ship one system', () => {
  it('variables.css never declares one name twice with two values', () => {
    const s = useDesignStore.getState()
    for (const brand of brands) expect(contradictions(buildCSS(captureCodeSnapshot(s, brand) as never))).toEqual([])
  })

  it('every Categorical role: CSS = tokens.json = agent context = plugin, both themes', () => {
    const s = useDesignStore.getState()
    const differ: string[] = []
    for (const brand of brands) {
      const snap = captureCodeSnapshot(s, brand)
      const json = generateTokenJSON(snap) as unknown as { colors: { architecture: { tokens: Arch } } }
      const css = buildCSS(snap as never)
      const md = brandContext(s, brand, { scope: 'color', appearance: 'both', detail: 'tokens' } as never)
      const plugin = (pluginPayload(s, brand, 'both') as unknown as { colors: { architecture: { tokens: Arch } } }).colors.architecture.tokens
      const ctx = new Map([...md.matchAll(/^\| `[^`]+` \| `([a-z0-9.-]+)` \| `(#[0-9a-fA-F]{6,8})` \| `(#[0-9a-fA-F]{6,8})` \|/gm)]
        .map((m) => [m[1], { light: m[2], dark: m[3] }]))
      for (const appearance of ['light', 'dark'] as const) {
        const env = cssEnv(css, appearance === 'dark')
        for (const [group, roles] of Object.entries(json.colors.architecture.tokens)) {
          for (const [role, modes] of Object.entries(roles)) {
            const want = modes[appearance]
            if (!want) continue
            const id = `${group}.${role}`
            const got = {
              css: env.get(`--color-${group}-${role.replace(/\./g, '-')}`),
              context: ctx.get(id)?.[appearance],
              plugin: plugin[group]?.[role]?.[`${brand}::${appearance}`],
            }
            for (const [where, value] of Object.entries(got)) {
              if (!value || norm(value) !== norm(want)) differ.push(`${brand} ${appearance} ${id}: ${where} ${value} · json ${want}`)
            }
          }
        }
      }
    }
    expect(differ).toEqual([])
  })

  it("the section CSS's semantic colours are variables.css's light values", () => {
    const s = useDesignStore.getState()
    const snap = captureCodeSnapshot(s, brands[3])
    const full = cssEnv(buildCSS(snap as never), false)
    const section = cssEnv(buildSectionExport('color', 'css', 'hex', {}, snap as never), false)
    expect(section.get('--color-action-primary-default')).toBeTruthy()
    for (const name of ['--color-content-primary', '--color-content-inverse', '--color-content-disabled', '--color-border-strong', '--color-action-primary-default']) {
      expect(norm(section.get(name) ?? ''), name).toBe(norm(full.get(name) ?? ''))
    }
  })
})
