import { describe, expect, it } from 'vitest'
import {
  buildArchitectureView,
  CATEGORICAL_ROLE_COMMENTS,
  categoricalNestedPath,
  projectArchitecture,
} from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { buildCategoricalSymbolicTokens, generateTokenJSON } from '../tokenGenerator'
import { buildWizardExport } from '../exportWizard'
import { unzipStore } from '../zipStore'

/**
 * Categorical ships a nested role contract: dotted ids internally
 * (`content.link.default`, `status.critical.surface`, …). The Skill export
 * carries that contract as Agent Skills markdown.
 */

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const view = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
} as never, system.errorSeed)!

const roleIds = view.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`))

describe('the categorical catalogue is complete', () => {
  it('ships 39 roles across five groups', () => {
    expect(roleIds).toHaveLength(39)
    for (const group of ['content', 'action', 'surface', 'status', 'border']) {
      expect(view.categories.some((c) => c.key === group), group).toBe(true)
    }
  })

  it('every role has a [ROLE] guidance comment for the AI export', () => {
    const missing = roleIds.filter((id) => !CATEGORICAL_ROLE_COMMENTS[id]?.startsWith('[ROLE:'))
    expect(missing, `missing guidance for ${missing.join(', ')}`).toEqual([])
    const extra = Object.keys(CATEGORICAL_ROLE_COMMENTS).filter((id) => !roleIds.includes(id))
    expect(extra, `stale comments for ${extra.join(', ')}`).toEqual([])
  })

  it('nests dotted keys under their group segments', () => {
    expect(categoricalNestedPath('content', 'link.default')).toEqual(['content', 'link', 'default'])
    expect(categoricalNestedPath('status', 'critical.surface')).toEqual(['status', 'critical', 'surface'])
    expect(categoricalNestedPath('action', 'primary.default')).toEqual(['action', 'primary', 'default'])
    expect(categoricalNestedPath('surface', 'page')).toEqual(['surface', 'page'])
  })

  it('uses the layout-tuned dark steps as catalogue defaults', () => {
    const label = (group: string, key: string) =>
      view.categories.find((c) => c.key === group)?.tokens.find((t) => t.key === key)?.modes.dark.label
    expect(label('surface', 'inverse')).toBe('neutral.4')
    expect(label('action', 'primary.pressed')).toBe('accent.6')
    expect(label('border', 'subtle')).toBe('neutral-dark.4')
    expect(label('border', 'strong')).toBe('neutral-dark.6')
    expect(label('status', 'critical.content')).toBe('error.10')
    expect(label('status', 'warning.content')).toBe('warning.11')
    expect(label('status', 'success.content')).toBe('success.11')
    expect(label('status', 'critical.surface-solid')).toBe('error.12')
  })
})

describe('buildCategoricalSymbolicTokens matches the architecture view', () => {
  it('emits one alias per role per theme', () => {
    const { themeOrder, tokens } = buildCategoricalSymbolicTokens()
    expect(themeOrder.length).toBeGreaterThanOrEqual(2)
    for (const id of roleIds) {
      const [group, ...rest] = id.split('.')
      const key = rest.join('.')
      for (const theme of themeOrder) {
        expect(tokens[group]?.[key]?.[theme], `${id} · ${theme}`).toMatch(/^\{[^}]+\}$/)
      }
    }
  })
})

describe('generateTokenJSON is the live-sync payload the plugin GETs', () => {
  it('ships nested categorical keys, not the pre-v51 flat ids', () => {
    const json = generateTokenJSON()
    expect(json.colors.semanticArchitecture).toBe('categorical')
    const arch = json.colors.architecture as {
      kind: string
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(arch.kind).toBe('categorical')
    expect(arch.tokens.action['primary.default']).toBeDefined()
    expect(arch.tokens.action.primary).toBeUndefined()
    expect(arch.tokens.status['critical.surface']).toBeDefined()
    expect(arch.tokens.status['critical-bg']).toBeUndefined()
    expect(arch.tokens.status['critical.content']).toBeDefined()
    expect(arch.tokens.content['on-action']).toBeDefined()
    expect(arch.tokens.border.strong).toBeDefined()
    for (const id of roleIds) {
      const [group, ...rest] = id.split('.')
      const key = rest.join('.')
      const light = arch.tokens[group]?.[key]?.light
      expect(light, id).toMatch(/^(#[0-9a-fA-F]{6}|\{[a-z0-9-]+\.\d+\})$/)
    }
  })
})

describe('projectArchitecture keeps nested override ids', () => {
  const input = {
    themes: {},
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {},
    scales: system.scales,
    accent: system.accent,
  } as never

  it('applies action.primary.default instead of truncating at primary', () => {
    const baseline = projectArchitecture('categorical', input, system.errorSeed, {}, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    const edited = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary.default': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(baseline.tokens.action['primary.default']).toBeDefined()
    expect(baseline.tokens.action.primary).toBeUndefined()
    expect(edited.tokens.action['primary.default'].light)
      .not.toBe(baseline.tokens.action['primary.default'].light)
  })

  it('rewrites legacy action.primary overrides onto primary.default', () => {
    const nested = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary.default': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    const legacy = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(legacy.tokens.action['primary.default'].light)
      .toBe(nested.tokens.action['primary.default'].light)
  })
})

describe('the Skill export format', () => {
  const files = buildWizardExport({
    collections: [],
    modes: ['light', 'dark'],
    format: 'skill',
    structure: 'single',
    colorFormat: 'hex',
    includeAliases: true,
    includeComponents: false,
  })

  it('ships a Figma MCP skill zip (SKILL.md + references/)', () => {
    expect(files).toHaveLength(1)
    expect(files[0].name).toMatch(/\.zip$/)
    expect(files[0].language).toBe('zip')
    expect(files[0].binary?.length).toBeGreaterThan(100)

    const md = files[0].content
    expect(md).toMatch(/^---\nname: /)
    expect(md).toContain('description:')
    expect(md).toContain('compatibility:')
    expect(md).toContain('mcp-server: figma')
    expect(md).toContain('## When to use')
    expect(md).toContain('## Instructions')
    expect(md).toContain('## Examples')
    expect(md).toContain('## Common edge cases')
    expect(md).toContain('figma-use')
    expect(md).toContain('Color Semantics')

    const desc = md.match(/^description: "([^"]*)"/m)?.[1] ?? ''
    expect(desc.length).toBeGreaterThan(0)
    expect(desc.length).toBeLessThanOrEqual(1024)
    const name = md.match(/^name: ([a-z0-9-]+)$/m)?.[1] ?? ''
    expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(name.length).toBeLessThanOrEqual(64)

    const unzipped = unzipStore(files[0].binary!)
    const paths = unzipped.map((f) => f.path)
    expect(paths).toContain('SKILL.md')
    expect(paths).toContain('references/tokens.md')
    expect(paths).toContain('references/foundations.md')
    expect(paths).toContain('references/semantic-contract.md')
    expect(md).toContain('## Token catalog')
    expect(md).toContain('#### Content')
    expect(md).toContain('#### Action')
    expect(md).toContain('#### Surface')
    expect(md).toContain('#### Status')
    expect(md).toContain('#### Border')
    expect(md).toContain('`Action/primary/default`')
    expect(md).toContain('`Content/primary`')
    expect(md).toContain('Spacing')
    expect(md).toContain('step/{n}')

    const tokensMd = new TextDecoder().decode(
      unzipped.find((f) => f.path === 'references/tokens.md')!.data,
    )
    expect(tokensMd).toContain('Color Primitives')
    expect(tokensMd).toContain('### Content')
    expect(tokensMd).toContain('### Action')
    expect(tokensMd).toContain('`Content/primary`')
    expect(tokensMd).toContain('`Action/primary/default`')

    const foundationsMd = new TextDecoder().decode(
      unzipped.find((f) => f.path === 'references/foundations.md')!.data,
    )
    expect(foundationsMd).toContain('## Spacing')
    expect(foundationsMd).toContain('## Radius')
    expect(foundationsMd).toContain('## Shadows')
    expect(foundationsMd).toContain('/Shadow/')
    expect(foundationsMd).toContain('## Icons')
    expect(foundationsMd).toContain('https://github.com/untitleduico/icons')
    expect(md).toContain('### Icons')
    expect(md).toContain('https://github.com/untitleduico/icons')
    expect(md).toContain('When generating UI for this product, use icons from')
  })

  it('puts every categorical role in the semantic-contract reference', () => {
    const unzipped = unzipStore(files[0].binary!)
    const contract = new TextDecoder().decode(
      unzipped.find((f) => f.path.endsWith('semantic-contract.md'))!.data,
    )
    for (const id of roleIds) {
      expect(contract, id).toContain(`\`${id}\``)
      expect(contract, id).toContain(CATEGORICAL_ROLE_COMMENTS[id]!)
    }
    expect(contract).toContain('`Content/primary`')
    expect(contract).toContain('`Action/primary/default`')
    expect(contract).toContain('`var(--color-content-link-default)`')
    expect(contract).toContain('`border.focus`')
    expect(contract).not.toContain('`border.active`')
  })

  it('nests content.link and action.primary in the contract list', () => {
    const unzipped = unzipStore(files[0].binary!)
    const contract = new TextDecoder().decode(
      unzipped.find((f) => f.path.endsWith('semantic-contract.md'))!.data,
    )
    expect(contract).toContain('`content.link.default`')
    expect(contract).toContain('`content.link.hover`')
    expect(contract).toContain('`action.primary.default`')
    expect(contract).toContain('`status.critical.surface`')
    expect(contract).toContain('`status.critical.content`')
  })
})
