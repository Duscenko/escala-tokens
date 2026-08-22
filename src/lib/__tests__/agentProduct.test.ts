import { describe, expect, it } from 'vitest'
import {
  buildAgentBundle,
  buildAgentProductBundle,
  buildAgentSkillFiles,
} from '../agentBundle'
import { lintEntriesForTest } from '../agentBundle/productChecker'
import { unzipStore } from '../zipStore'
import { buildWizardExport } from '../exportWizard'
import type { TokenJSON } from '../agentBundle'

const FIXTURE: TokenJSON = {
  project: 'Parity',
  colors: {
    primitive: { 'accent-6': '#7f56d9' },
    themeOrder: ['light', 'dark'],
    semanticArchitecture: 'categorical',
    architecture: {
      kind: 'categorical',
      tokens: {
        action: { 'primary.default': { light: '#7f56d9', dark: '#9e77ed' } },
      },
    },
  },
  typography: { fontFamily: 'Inter', sizes: { 'text-md': '16px' }, weights: { medium: 500 } },
  spacing: { '4': '16px' },
  radius: { md: '8px' },
  atoms: ['Button'],
  icons: { aiSource: { key: 'untitled', label: 'Untitled UI Icons', repo: 'https://github.com/untitleduico/icons', npm: '@untitledui/icons' } },
}

describe('agent product bundle reuses the Skill files', () => {
  it('contains every Skill path with identical bytes', () => {
    const skill = buildAgentSkillFiles(FIXTURE)
    const product = buildAgentProductBundle(FIXTURE)
    const skillMap = Object.fromEntries(skill.files.map((f) => [f.path, f.text]))
    const productMap = Object.fromEntries(product.files.map((f) => [f.path, f.text]))
    for (const [path, text] of Object.entries(skillMap)) {
      expect(productMap[path], path).toBe(text)
    }
    expect(buildAgentBundle(FIXTURE).skillMd).toBe(skillMap['SKILL.md'])
  })

  it('adds the five agent layers without renaming Skill files', () => {
    const pack = buildAgentProductBundle(FIXTURE)
    const paths = pack.files.map((f) => f.path)
    expect(paths).toEqual(expect.arrayContaining([
      'AGENTS.md',
      'llms.txt',
      'SKILL.md',
      'references/tokens.md',
      'references/foundations.md',
      'references/semantic-contract.md',
      'skills/code/SKILL.md',
      'skills/a11y-audit/SKILL.md',
      'skills/migrate/SKILL.md',
      'templates/component/Button.tsx',
      'checkers/token-lint.mjs',
    ]))
    expect(paths.filter((p) => p === 'SKILL.md')).toHaveLength(1)
    expect(pack.skillMd).toContain('# Parity')
    expect(pack.skillMd).toContain('Do not invent')
    expect(unzipStore(pack.zip).map((f) => f.path)).toEqual(paths)
  })

  it('generates a checker that knows this system\'s hex', () => {
    const entries = lintEntriesForTest(FIXTURE)
    expect(entries.some((e) => e.needle.toLowerCase() === '#7f56d9' && e.css.includes('action-primary-default'))).toBe(true)
    expect(entries.some((e) => e.needle === '16px' && e.css === 'var(--spacing-4)')).toBe(true)
    const lint = packFile(FIXTURE, 'checkers/token-lint.mjs')
    expect(lint).toContain('#7f56d9')
    expect(lint).toContain('var(--color-action-primary-default)')
  })

  it('Button template binds semantic CSS variables', () => {
    const tsx = packFile(FIXTURE, 'templates/component/Button.tsx')
    expect(tsx).toContain('var(--color-action-primary-default)')
    expect(tsx).toContain('var(--color-content-on-action)')
    expect(tsx).not.toContain('#7f56d9')
  })
})

describe('wizard format agent-bundle', () => {
  it('ships one zip and leaves the Skill format unchanged', () => {
    const skill = buildWizardExport({
      collections: [],
      modes: ['light', 'dark'],
      format: 'skill',
      structure: 'single',
      colorFormat: 'hex',
      includeAliases: true,
      includeComponents: false,
    })
    const bundle = buildWizardExport({
      collections: [],
      modes: ['light', 'dark'],
      format: 'agent-bundle',
      structure: 'single',
      colorFormat: 'hex',
      includeAliases: true,
      includeComponents: false,
    })
    expect(skill).toHaveLength(1)
    expect(skill[0]!.name).toMatch(/\.zip$/)
    expect(skill[0]!.name).not.toContain('agent-bundle')
    expect(bundle).toHaveLength(1)
    expect(bundle[0]!.name).toMatch(/agent-bundle\.zip$/)
    const skillPaths = unzipStore(skill[0]!.binary!).map((f) => f.path)
    const bundlePaths = unzipStore(bundle[0]!.binary!).map((f) => f.path)
    expect(skillPaths).toContain('SKILL.md')
    expect(skillPaths).not.toContain('AGENTS.md')
    expect(bundlePaths).toEqual(expect.arrayContaining(['AGENTS.md', 'SKILL.md', 'checkers/token-lint.mjs']))
  })
})

function packFile(json: TokenJSON, path: string): string {
  const hit = buildAgentProductBundle(json).files.find((f) => f.path === path)
  if (!hit) throw new Error(`missing ${path}`)
  return hit.text
}
