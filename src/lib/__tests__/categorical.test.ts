import { describe, expect, it } from 'vitest'
import { buildArchitectureView, CATEGORICAL_ROLE_COMMENTS } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { buildCategoricalSymbolicTokens } from '../tokenGenerator'
import { buildWizardExport } from '../exportWizard'

/**
 * Categorical is a fixed 39-role catalogue. P8 expanded it from 29 and added
 * the "Categorical Semantic (AI-Guided)" export — real aliases plus [ROLE]
 * guidance per token.
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
})

describe('buildCategoricalSymbolicTokens matches the architecture view', () => {
  it('emits one alias per role per theme', () => {
    const { themeOrder, tokens } = buildCategoricalSymbolicTokens()
    expect(themeOrder.length).toBeGreaterThanOrEqual(2)
    for (const id of roleIds) {
      const [group, key] = id.split('.')
      for (const theme of themeOrder) {
        expect(tokens[group]?.[key]?.[theme], `${id} · ${theme}`).toMatch(/^\{[^}]+\}$/)
      }
    }
  })
})

describe('the AI-Guided export format', () => {
  const files = buildWizardExport({
    collections: [],
    modes: ['light', 'dark'],
    format: 'categorical-ai',
    structure: 'single',
    colorFormat: 'hex',
    includeAliases: true,
    includeComponents: false,
  })

  it('ships one JSON document with mode-first nesting', () => {
    expect(files).toHaveLength(1)
    expect(files[0].name).toMatch(/\.categorical\.tokens\.json$/)
    const tree = JSON.parse(files[0].content) as Record<string, Record<string, Record<string, { $value: string; comment: string; alpha?: number }>>>
    expect(Object.keys(tree).sort()).toEqual(['dark', 'light'])
    for (const mode of ['light', 'dark']) {
      expect(Object.keys(tree[mode]).sort()).toEqual(['action', 'border', 'content', 'status', 'surface'])
      for (const id of roleIds) {
        const [group, key] = id.split('.')
        const outKey = id === 'border.active' ? 'focus' : key
        const leaf = tree[mode][group]?.[outKey]
        expect(leaf?.$value, `${mode} ${id}`).toMatch(/^\{[^}]+\}$/)
        expect(leaf?.comment, `${mode} ${id}`).toMatch(/^\[ROLE:/)
      }
    }
  })

  it('renames border.active to border.focus in the shipped keys', () => {
    const tree = JSON.parse(files[0].content)
    expect(tree.light.border.active).toBeUndefined()
    expect(tree.light.border.focus.$value).toMatch(/^\{accent\.\d+\}$/)
  })

  it('carries alpha on surface.overlay', () => {
    const tree = JSON.parse(files[0].content)
    expect(tree.light.surface.overlay.alpha).toBe(0.5)
  })
})
