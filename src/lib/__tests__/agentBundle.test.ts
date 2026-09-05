import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { agentMarkdownFromJSON, buildAgentBundle, buildAgentSkillFiles, type TokenJSON } from '../agentBundle'
import { generateTokenJSON } from '../tokenGenerator'
import { buildSkillExport } from '../skillExport'
import { unzipStore } from '../zipStore'
import { buildCSS, buildMarkdown } from '../exporters'
import { captureSnapshot, makeDesignDefaults, scopeSnapshotToTheme, useDesignStore } from '../../store/useDesignStore'
import { scopeSnapshotForCode } from '../codeScope'

const bundleDir = join(dirname(fileURLToPath(import.meta.url)), '../agentBundle')

const MINIMAL: TokenJSON = {
  project: 'Parity',
  colors: { primitive: { 'accent-6': '#7f56d9' } },
  typography: { fontFamily: 'Inter', sizes: { 'text-md': '16px' }, weights: { medium: 500 } },
  spacing: { '1': '4px' },
  radius: { md: '8px' },
  icons: { aiSource: { key: 'untitled', label: 'Untitled UI Icons', repo: 'https://github.com/untitleduico/icons', npm: '@untitledui/icons' } },
}

function bytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

describe('agentBundle import boundary', () => {
  it('does not import the store or tokenGenerator', () => {
    const files = readdirSync(bundleDir).filter((f) => f.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const src = readFileSync(join(bundleDir, file), 'utf8')
      expect(src, file).not.toMatch(/useDesignStore/)
      expect(src, file).not.toMatch(/from ['"]\.\.\/tokenGenerator['"]/)
      expect(src, file).not.toMatch(/from ['"]\.\.\/store\//)
    }
  })
})

describe('buildAgentBundle is store-free', () => {
  it('builds a Skill zip from a plain TokenJSON', () => {
    const pack = buildAgentBundle(MINIMAL)
    expect(pack.name).toBe('parity-design-system')
    expect(pack.skillMd).toContain('# Parity design system')
    expect(pack.skillMd).toContain('## Token catalog')
    expect(pack.skillMd).toContain('`Action/primary/default`')
    expect(pack.skillMd).toContain('https://github.com/untitleduico/icons')

    const paths = unzipStore(pack.zip).map((f) => f.path)
    expect(paths).toEqual([
      'SKILL.md',
      'references/tokens.md',
      'references/foundations.md',
      'references/semantic-contract.md',
    ])
  })
})

describe('wrapper parity', () => {
  it('JSON-only bundle matches the store wrapper byte-for-byte', () => {
    const json = generateTokenJSON()
    const fromJson = buildAgentBundle(json)
    const fromStore = buildSkillExport()
    expect(fromJson.name).toBe(fromStore.name)
    expect(fromJson.skillMd).toBe(fromStore.skillMd)
    expect(bytes(fromJson.zip, fromStore.zip)).toBe(true)
  })

  it('explicit store opts still match generateTokenJSON() alone', () => {
    const store = useDesignStore.getState()
    const json = generateTokenJSON()
    const a = buildAgentBundle(json)
    const b = buildAgentBundle(json, {
      projectFallback: store.projectName,
      iconKey: store.iconAiSource,
    })
    expect(a.skillMd).toBe(b.skillMd)
    expect(bytes(a.zip, b.zip)).toBe(true)
  })

  it('a theme-scoped snapshot lists one mode in agent context', () => {
    const full = useDesignStore.getState()
    const scoped = scopeSnapshotToTheme(captureSnapshot(full), 'dark')
    const json = generateTokenJSON(scoped)
    expect(json.colors.themeOrder).toEqual(['dark'])
    const { files } = buildAgentSkillFiles(json)
    const tokensMd = files.find((file) => file.path === 'references/tokens.md')?.text ?? ''
    expect(tokensMd).toMatch(/\*\*Modes \(Color Semantics columns\):\*\* `Dark`/)
    expect(tokensMd).not.toMatch(/`Light`, `Dark`/)
  })

  it('Get code ships one theme as a light/dark pair, never every library theme', async () => {
    useDesignStore.setState(makeDesignDefaults())
    const { adoptPreset } = await import('../adoptPreset')
    const { THEME_STYLE_PRESETS } = await import('../themePresets')
    const neo = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const glass = THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const adopted = adoptPreset(neo, 'light')
    const other = adoptPreset(glass, 'light')
    expect('error' in adopted).toBe(false)
    expect('error' in other).toBe(false)
    if ('error' in adopted || 'error' in other) return

    const full = useDesignStore.getState()
    const scoped = scopeSnapshotForCode(captureSnapshot(full), adopted.key)
    const asStore = scoped as ReturnType<typeof useDesignStore.getState>
    const otherBrand = full.themeSources[other.key]?.brand

    const cssAll = buildCSS(full)
    const cssOne = buildCSS(asStore)
    expect(cssAll).toContain('.dark, [data-theme="dark"]')
    expect(cssAll).toContain(`[data-theme="${adopted.key}"]`)
    expect(cssAll).toContain(`[data-theme="${other.key}"]`)
    expect(cssOne).toContain('/* Semantic tokens — light */')
    expect(cssOne).toContain('.dark, [data-theme="dark"]')
    expect(cssOne).not.toContain(`[data-theme="${adopted.key}"]`)
    expect(cssOne).not.toContain(`[data-theme="${other.key}"]`)
    if (otherBrand && otherBrand !== 'accent') {
      expect(cssOne).not.toContain(`--color-${otherBrand}-`)
    }
    expect(scoped.customColors).toEqual([])
    expect(scoped.themeOrder).toEqual(['light', 'dark'])

    const mdAll = buildMarkdown(full)
    const mdOne = buildMarkdown(asStore)
    expect(mdAll).toMatch(/data-theme="<name>"/)
    expect(mdOne).not.toMatch(/data-theme="<name>"/)
    expect(mdOne).toMatch(/- \*\*Themes:\*\* Light, Dark/)

    const { files } = buildAgentSkillFiles(generateTokenJSON(scoped))
    const tokensMd = files.find((file) => file.path === 'references/tokens.md')?.text ?? ''
    expect(generateTokenJSON(scoped).colors.themeOrder).toEqual(['light', 'dark'])
    expect(tokensMd).toMatch(/\*\*Modes \(Color Semantics columns\):\*\* `Light`, `Dark`/)
    expect(tokensMd).not.toContain(adopted.key)
    expect(tokensMd).not.toContain(other.key)
  })

  it('Get code maps a dark-created theme to :root dark and .light', async () => {
    useDesignStore.setState(makeDesignDefaults())
    const { adoptPreset } = await import('../adoptPreset')
    const { THEME_STYLE_PRESETS } = await import('../themePresets')
    const preset = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const adopted = adoptPreset(preset, 'dark')
    expect('error' in adopted).toBe(false)
    if ('error' in adopted) return

    const scoped = scopeSnapshotForCode(captureSnapshot(useDesignStore.getState()), adopted.key)
    const css = buildCSS(scoped as ReturnType<typeof useDesignStore.getState>)
    expect(scoped.themeOrder).toEqual(['dark', 'light'])
    expect(css).toContain('/* Semantic tokens — dark */')
    expect(css).toContain('.light, [data-theme="light"]')
    expect(css).not.toMatch(/:root, \[data-theme="light"\]/)
    expect(css).not.toContain(`[data-theme="${adopted.key}"]`)

    const { files } = buildAgentSkillFiles(generateTokenJSON(scoped))
    const tokensMd = files.find((file) => file.path === 'references/tokens.md')?.text ?? ''
    expect(tokensMd).toMatch(/\*\*Modes \(Color Semantics columns\):\*\* `Dark`, `Light`/)
  })
})

describe('agentMarkdownFromJSON is the Get code · Agent clipboard', () => {
  it('wraps the Skill catalog files in the agent-context envelope', () => {
    const json = generateTokenJSON()
    const { files } = buildAgentSkillFiles(json)
    const tokensMd = files.find((file) => file.path === 'references/tokens.md')?.text ?? ''
    const foundationsMd = files.find((file) => file.path === 'references/foundations.md')?.text ?? ''
    const md = agentMarkdownFromJSON(json)
    expect(md).toContain('format: agent-context/v1')
    expect(md).toContain('source: escala-tokens')
    expect(md).toContain(tokensMd.trim())
    expect(md).toContain(foundationsMd.trim())
    expect(md).toContain('Do not invent parallel names, hex, or px when a token exists.')
  })
})
