import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildAgentBundle, type TokenJSON } from '../agentBundle'
import { generateTokenJSON } from '../tokenGenerator'
import { buildSkillExport } from '../skillExport'
import { unzipStore } from '../zipStore'
import { captureSnapshot, scopeSnapshotToTheme, useDesignStore } from '../../store/useDesignStore'

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
    const pack = buildSkillExport('hex', scoped)
    expect(pack.skillMd).toMatch(/\*\*Modes \(Color Semantics columns\):\*\* `Dark`/)
    expect(pack.skillMd).not.toMatch(/`Light`, `Dark`/)
  })
})
