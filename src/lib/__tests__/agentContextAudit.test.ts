// Locks the 2026-10-18 audit of "context for agents": every paste agrees with
// variables.css, names what the Figma plugin actually writes, honours the
// appearance it was asked for, and never hands an agent code that does not
// parse or a command that does not exist.
import { beforeAll, describe, expect, it } from 'vitest'
import ts from 'typescript'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { ensureColorScales } from '../colorActions'
import { captureCodeSnapshot } from '../codeScope'
import { brandContext, contextTokenJson } from '../contextSource'
import { CONTEXT_FOUNDATIONS, cutComponentContext } from '../contextRequest'
import { buildCSS } from '../exporters'
import { buildAgentSkillFiles } from '../agentBundle'
import { buildTemplateFiles } from '../agentBundle/productTemplates'
import { agentContextMarkdown, componentFileName } from '../agentContext'
import { COMPONENTS, COMPONENT_KEYS } from '../componentCatalogue'
import { registryItemFor } from '../registry/shadcnRegistry'
import { resolvePreviewTokens } from '../previewTokens'
import { buildSectionExport, darkPrimitiveLabel } from '../sectionExport'
import { generateTokenJSON } from '../tokenGenerator'
import { offlineSkillCommand, unzipSkillCommand } from '../agentInstall'
import { CLI_PUBLISHED } from '../featureFlags'
import type { TokenJSON } from '../agentBundle/types'

let brand = ''

beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  ensureColorScales()
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  const adopted = adoptPreset(THEME_STYLE_PRESETS[0], 'light')
  if ('error' in adopted) throw new Error(adopted.error)
  brand = adopted.key
  ensureColorScales()
})

/** `--name: value;` declarations of one CSS block, first occurrence of the selector. */
function cssBlock(css: string, selector: string): Record<string, string> {
  const i = css.indexOf(selector)
  if (i < 0) return {}
  const body = css.slice(i, css.indexOf('\n}', i))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/** `| Figma | role.id | value | value |` rows of the Color Semantics tables. */
function semanticRows(md: string): { id: string; column: string; value: string }[] {
  const rows: { id: string; column: string; value: string }[] = []
  let header: string[] | null = null
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) { header = null; continue }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells[1] === 'Role id') { header = cells; continue }
    if (!header || cells[0].startsWith('---')) continue
    header.slice(2).forEach((h, i) => rows.push({ id: cells[1].replace(/`/g, ''), column: h, value: cells[2 + i].replace(/`/g, '') }))
  }
  return rows
}

describe('system paste vs variables.css', () => {
  it('every semantic colour in a Light, Dark and Both paste is the value variables.css ships', () => {
    const store = useDesignStore.getState()
    const css = buildCSS(captureCodeSnapshot(store, brand) as never)
    const light = cssBlock(css, ':root {')
    const dark = { ...light, ...cssBlock(css, '.dark, [data-theme="dark"] {') }
    for (const appearance of ['light', 'dark', 'both'] as const) {
      const md = brandContext(store, brand, { scope: 'color', detail: 'tokens', appearance })
      const rows = semanticRows(md)
      expect(rows.length).toBeGreaterThan(60)
      for (const r of rows) {
        const vars = r.column === 'Dark' ? dark : light
        expect(`${r.id} ${r.column} ${r.value}`).toBe(`${r.id} ${r.column} ${vars[`color-${r.id.replace(/\./g, '-')}`]}`)
      }
    }
  })
})

describe('appearance narrowing', () => {
  const twins = (json: TokenJSON) => Object.keys(json.colors.primitive ?? {}).filter((k) => /-dark-\d+$/.test(k))

  it('a Light paste ships no dark ramp, a Dark paste no light ramp — and no semantic loses its primitive', () => {
    const store = useDesignStore.getState()
    for (const appearance of ['light', 'dark'] as const) {
      const json = contextTokenJson(store, brand, appearance)
      const prim = Object.keys(json.colors.primitive ?? {})
      if (appearance === 'light') expect(twins(json)).toEqual([])
      else expect(twins(json).length).toBe(prim.length)
      const hexes = new Set([...Object.values(json.colors.primitive ?? {}), ...Object.values(json.colors.primitiveAlpha ?? {})].map((h) => h.toLowerCase()))
      for (const [group, tokens] of Object.entries(json.colors.architecture?.tokens ?? {})) {
        for (const [key, byMode] of Object.entries(tokens)) {
          const v = (byMode[appearance] ?? '').toLowerCase()
          if (/^#(000000|ffffff)/.test(v)) continue // black-a / white-a constants
          expect(hexes.has(v), `${group}.${key} ${v}`).toBe(true)
        }
      }
    }
  })

  it('shadows and gradients carry the asked appearance, under its own label', () => {
    const store = useDesignStore.getState()
    const both = contextTokenJson(store, brand, 'both')
    const darkMd = brandContext(store, brand, { scope: 'shadow', detail: 'tokens', appearance: 'dark' })
    expect(darkMd).toContain('| Figma style | CSS | Dark |')
    expect(darkMd).toContain(`| \`Shadow/xs (Dark)\` | \`var(--shadow-xs)\` | \`${both.shadowsDark!.xs}\` |`)
    expect(darkMd).not.toContain(both.shadows!.xs)
    const lightMd = brandContext(store, brand, { scope: 'shadow', detail: 'tokens', appearance: 'light' })
    expect(lightMd).toContain('| Figma style | CSS | Light |')
    expect(lightMd).not.toContain(both.shadowsDark!.xs)

    const slug = Object.keys(both.gradients!)[0]
    const gDark = brandContext(store, brand, { scope: 'gradients', detail: 'tokens', appearance: 'dark' })
    expect(gDark).toContain(both.gradientsDark![slug])
    expect(gDark).not.toContain(both.gradients![slug])
    // Both: the Skill's own foundations.md now ships the dark gradients too.
    const gBoth = brandContext(store, brand, { scope: 'gradients', detail: 'tokens', appearance: 'both' })
    expect(gBoth).toContain(both.gradientsDark![slug])
  })
})

describe('Figma names are the ones the plugin writes', () => {
  it('styles carry no project prefix; type families and roles use the plugin names', () => {
    const json = generateTokenJSON(captureCodeSnapshot(useDesignStore.getState(), brand)) as unknown as TokenJSON
    const files = buildAgentSkillFiles(json, { projectFallback: 'Escala' }).files
    const all = files.map((f) => f.text).join('\n')
    expect(all).not.toMatch(/\{project\}\//)
    expect(all).not.toMatch(/`[A-Za-z0-9 -]+\/(Shadow|Type|Gradient)\//)
    const foundations = files.find((f) => f.path === 'references/foundations.md')!.text
    expect(foundations).toContain('`font-family-body`')
    expect(foundations).toContain('`Type/label`')
    expect(foundations).toContain('`Gradient/')
    const skill = files.find((f) => f.path === 'SKILL.md')!.text
    expect(skill).toContain('Desktop · Tablet · Mobile (viewports, not themes) | Primitives (`font-family-body`')
    expect(skill).not.toMatch(/`Spacing`, `Radius`, `Size`, `Grid`/)
    expect(skill).toContain('`Status/*/surface-solid`')
  })

  it('Docs labels a dark cell with the dark twin it actually is', () => {
    expect(darkPrimitiveLabel('accent.11')).toBe('accent-dark.11')
    expect(darkPrimitiveLabel('error-a.3')).toBe('error-a-dark.3')
    expect(darkPrimitiveLabel('neutral.1')).toBe('neutral.1')
    expect(darkPrimitiveLabel('neutral-dark.12')).toBe('neutral-dark.12')
    expect(darkPrimitiveLabel('white-a.3')).toBe('white-a.3')
    const md = buildSectionExport('color', 'md', 'hex', { modes: ['light', 'dark'] })
    const row = md.split('\n').find((l) => l.startsWith('| `content.accent`'))!
    expect(row).toContain('`accent.11`')
    expect(row).toContain('`accent-dark.11`')
  })
})

describe('component briefs', () => {
  it('the import path is the file the registry serves', () => {
    for (const def of COMPONENTS) {
      const item = registryItemFor(def.key)
      if (item) expect(componentFileName(def.key), def.key).toBe(item)
    }
  })

  it('Light + Dark repeats only what changes with the appearance', () => {
    const store = useDesignStore.getState()
    const card = COMPONENTS.find((c) => c.key === 'Card')!
    const light = agentContextMarkdown(card, '<Card />', resolvePreviewTokens(store, brand, 'light') as never)
    const dark = agentContextMarkdown(card, '<Card />', resolvePreviewTokens(store, brand, 'dark') as never)
    const md = cutComponentContext(light, { detail: 'tokens', appearance: 'both' }, dark)
    const darkPart = md.slice(md.indexOf('## Design tokens (live) — Dark'))
    expect(darkPart).toContain('### Tokens by part')
    expect(darkPart).not.toContain('### Radius')
    expect(darkPart).not.toContain('### Dimension primitives')
    expect(md.match(/### Radius \(/g)?.length).toBe(1)
  })
})

describe('agent bundle templates', () => {
  it('every catalogue component scaffolds to TSX that parses, with no invented variable', () => {
    const files = buildTemplateFiles({ atoms: COMPONENT_KEYS } as unknown as TokenJSON)
    expect(files.length).toBe(COMPONENT_KEYS.length)
    for (const f of files) {
      const out = ts.transpileModule(f.text, {
        fileName: f.path,
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2020 },
      })
      expect(out.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')) ?? [], f.path).toEqual([])
      expect(f.text, f.path).not.toContain('var(--font-family,')
    }
  })
})

describe('install commands', () => {
  it('no surface prints an npx command for a CLI that is not on npm', () => {
    if (CLI_PUBLISHED) return
    for (const agent of ['cursor', 'claude'] as const) {
      const cmd = offlineSkillCommand(agent, 'esc_x', 'Escala')
      expect(cmd).not.toContain('@escala/cli')
      expect(cmd).toBe(unzipSkillCommand(agent, 'Escala'))
    }
  })
})

describe('every scope cut is non-empty', () => {
  it.each(CONTEXT_FOUNDATIONS.map((f) => f.key))('%s', (scope) => {
    const md = brandContext(useDesignStore.getState(), brand, { scope, detail: 'tokens', appearance: 'light' })
    expect(md).not.toContain('_This system ships no tokens for this foundation._')
  })
})

describe('field outline is border.control', () => {
  it('v98 → v99 moves a stored border.strong override to border.control', async () => {
    const { moveBorderStrongToControl } = await import('../../store/useDesignStore')
    const over = { light: '{black-a.6}', dark: '{white-a.4}' }
    const state = { architectureOverrides: { categorical: { 'border.strong': { ...over } } as Record<string, unknown> } }
    moveBorderStrongToControl(state)
    expect(state.architectureOverrides.categorical['border.control']).toEqual(over)
    expect(state.architectureOverrides.categorical['border.strong']).toBeUndefined()
    const kept = { architectureOverrides: { categorical: { 'border.strong': { ...over }, 'border.control': { light: '{black-a.9}' } } as Record<string, unknown> } }
    moveBorderStrongToControl(kept)
    expect(kept.architectureOverrides.categorical['border.control']).toEqual({ light: '{black-a.9}' })
  })

  it('every field-like recipe paints its resting edge with border.control, never border.strong', async () => {
    const { COMPONENT_RECIPES, recipeColorRoles } = await import('../componentRecipes')
    for (const key of ['Input', 'Textarea', 'Select', 'Checkbox', 'RadioGroup', 'InputOTP', 'Chip', 'Button']) {
      const roles = recipeColorRoles(COMPONENT_RECIPES[key])
      expect(roles, key).toContain('border.control')
      expect(roles, key).not.toContain('border.strong')
    }
  })
})

describe('a paste is the brand that was asked for', () => {
  it('brand A and brand B paste their own values', async () => {
    const { adoptPreset } = await import('../adoptPreset')
    const { THEME_STYLE_PRESETS } = await import('../themePresets')
    const second = adoptPreset(THEME_STYLE_PRESETS[2], 'light')
    if ('error' in second) throw new Error(second.error)
    ensureColorScales()
    const store = useDesignStore.getState()
    const row = (b: string) => brandContext(store, b, { scope: 'color', detail: 'tokens', appearance: 'dark' })
      .split('\n').find((l) => l.includes('`action.primary.default`'))
    expect(row(brand)).toBeTruthy()
    expect(row(second.key)).toBeTruthy()
    expect(row(brand)).not.toBe(row(second.key))
    // Dark only: one value column.
    expect(row(brand)!.split('|').filter((c) => c.trim()).length).toBe(3)
  })
})
