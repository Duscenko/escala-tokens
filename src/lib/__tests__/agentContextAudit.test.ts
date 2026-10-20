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
import { figmaSemanticName } from '../agentBundle/names'

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

// ── Design skills (design-plans/design-skills-package.md) ──────────────────

const SEMANTIC_GROUPS = 'Content|Action|Surface|Status|Border'

function productJson(atoms?: string[]): TokenJSON {
  const json = generateTokenJSON(captureCodeSnapshot(useDesignStore.getState(), brand)) as unknown as TokenJSON
  return atoms ? { ...json, atoms } : json
}

function figmaRoleNames(json: TokenJSON): Set<string> {
  const names = new Set<string>()
  for (const [group, tokens] of Object.entries(json.colors.architecture?.tokens ?? {})) {
    for (const key of Object.keys(tokens)) names.add(figmaSemanticName(`${group}.${key}`))
  }
  return names
}

/** Every `Content/…`-shaped name a text cites; a `*` segment is a wildcard. */
function citedSemanticNames(text: string): string[] {
  return [...text.matchAll(new RegExp(`\\b(?:${SEMANTIC_GROUPS})(?:/[A-Za-z0-9*-]+)+`, 'g'))].map((m) => m[0])
}

function existsAsRole(name: string, roles: Set<string>): boolean {
  if (!name.includes('*')) return roles.has(name)
  const re = new RegExp(`^${name.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')).join('[^/]+(?:/[^/]+)*')}$`)
  return [...roles].some((r) => re.test(r))
}

/** The `.md` rows of a table with a `Bind to` and a `Collection` column. */
function bindingCells(md: string): { bind: string; collection: string }[] {
  const out: { bind: string; collection: string }[] = []
  let header: string[] | null = null
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) { header = null; continue }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.includes('Bind to')) { header = cells; continue }
    if (!header || cells[0].startsWith('---')) continue
    out.push({ bind: cells[header.indexOf('Bind to')], collection: cells[header.indexOf('Collection')] })
  }
  return out
}

function tableRows(md: string, firstHeader: string): string[][] {
  const rows: string[][] = []
  let on = false
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) { on = false; continue }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/`/g, ''))
    if (cells[0] === firstHeader) { on = true; continue }
    if (on && !cells[0].startsWith('---')) rows.push(cells)
  }
  return rows
}

describe('design skills cite only names the system ships', () => {
  it('every semantic Figma name in AGENTS.md and skills/*/SKILL.md is a role of the payload', async () => {
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const json = productJson()
    const roles = figmaRoleNames(json)
    const files = buildAgentProductFiles(json).files.filter((f) => f.path === 'AGENTS.md' || /^skills\/[^/]+\/SKILL\.md$/.test(f.path))
    expect(files.length).toBeGreaterThanOrEqual(7)
    for (const f of files) {
      for (const name of citedSemanticNames(f.text)) expect(existsAsRole(name, roles), `${f.path}: ${name}`).toBe(true)
    }
  })

  it('the field outline is Border/control everywhere a pairing is taught', async () => {
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const files = buildAgentProductFiles(productJson()).files
    const agents = files.find((f) => f.path === 'AGENTS.md')!.text
    const code = files.find((f) => f.path === 'skills/code/SKILL.md')!.text
    for (const text of [agents, code]) {
      expect(text).toContain(`\`${figmaSemanticName('surface.input')}\` + \`${figmaSemanticName('border.control')}\``)
      expect(text).not.toMatch(/Surface\/input`? \+ `?Border\/strong/)
    }
    const a11y = files.find((f) => f.path === 'skills/a11y-audit/SKILL.md')!.text
    expect(a11y).toContain('action-label WCAG 4.5 / Lc 60')
    expect(a11y).toContain(`\`${figmaSemanticName('status.critical.on-solid')}\` | \`${figmaSemanticName('status.critical.surface-solid')}\``)
  })

  it('every variable and style the design skills bind exists in the payload', async () => {
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const json = productJson([...COMPONENT_KEYS])
    const roles = figmaRoleNames(json)
    const dims: Record<string, Record<string, string> | undefined> = {
      Radius: json.radiusRoles, Spacing: json.spacingRoles, Size: json.sizeRoles, Selector: json.selectorRoles,
      Stroke: json.strokeRoles, Icon: json.icons?.sizes?.roles,
    }
    const files = buildAgentProductFiles(json).files.filter((f) => f.path.startsWith('skills/'))
    let checked = 0
    for (const f of files) {
      expect(f.text, f.path).not.toContain('not published in this system')
      for (const { bind, collection } of bindingCells(f.text)) {
        const names = bind.split(' + ').map((n) => n.replace(/`/g, ''))
        const cols = collection.split(' + ')
        expect(names.length, `${f.path}: ${bind}`).toBe(cols.length)
        names.forEach((name, i) => {
          checked++
          const col = cols[i]
          if (col === 'Color Semantics') expect(roles.has(name), `${f.path}: ${name}`).toBe(true)
          else if (col === 'Dimension Primitives') expect(json.dimensions?.[name], `${f.path}: ${name}`).toBeDefined()
          else if (col === 'Text style') expect(json.typography.roles?.[name.replace(/^Type\//, '')], `${f.path}: ${name}`).toBeDefined()
          else if (col === 'Effect style') expect(json.shadows?.[name.replace(/^Shadow\//, '')], `${f.path}: ${name}`).toBeDefined()
          else {
            const [group, , role] = name.split('/')
            expect(col, `${f.path}: ${name}`).toBe('Dimension Semantics')
            expect(dims[group]?.[role], `${f.path}: ${name}`).toBeDefined()
          }
        })
      }
      // Role and style names cited in prose (review rules, handoff tables).
      for (const m of f.text.matchAll(/`((Radius|Spacing|Size|Selector|Stroke|Icon)\/role\/([\w-]+)|Type\/([\w-]+)|Shadow\/([\w-]+))`/g)) {
        if (m[2]) expect(dims[m[2]]?.[m[3]], `${f.path}: ${m[1]}`).toBeDefined()
        else if (m[4]) expect(json.typography.roles?.[m[4]], `${f.path}: ${m[1]}`).toBeDefined()
        else expect(json.shadows?.[m[5]], `${f.path}: ${m[1]}`).toBeDefined()
      }
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('AGENTS.md and llms.txt route to every design skill, and the package ships it', async () => {
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const files = buildAgentProductFiles(productJson()).files
    const paths = new Set(files.map((f) => f.path))
    for (const skill of ['component-build', 'design-review', 'handoff-spec']) {
      const path = `skills/${skill}/SKILL.md`
      expect(paths.has(path), path).toBe(true)
      expect(files.find((f) => f.path === 'AGENTS.md')!.text).toContain(path)
      expect(files.find((f) => f.path === 'llms.txt')!.text).toContain(path)
    }
  })
})

describe('component-build ↔ recipes', () => {
  it('every layer a component file cites is a slot of its recipe, named the way the plugin names it', async () => {
    const { existsSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const { COMPONENT_RECIPES, serializeRecipes } = await import('../componentRecipes')
    const { buildDesignSkillFiles, componentBuildPath, figmaSlotsOf } = await import('../agentBundle/productDesignSkills')
    const { figmaLayerName } = await import('../agentBundle/figmaRefs')
    const pluginFile = join(dirname(fileURLToPath(import.meta.url)), '../../../../escala-figma-plugin/src/recipes.ts')
    const plugin = existsSync(pluginFile) ? await import(/* @vite-ignore */ pluginFile) : null
    const table = serializeRecipes()

    const json = productJson([...COMPONENT_KEYS])
    const files = buildDesignSkillFiles(json)
    for (const key of COMPONENT_KEYS) {
      const recipe = COMPONENT_RECIPES[key]
      if (!recipe) continue
      const md = files.find((f) => f.path === componentBuildPath(key))?.text
      expect(md, key).toBeTruthy()
      const recipeSlots = new Set(figmaSlotsOf(recipe))
      const layers = tableRows(md!, 'Layer').filter((r) => r.length === 3)
      expect(layers.length, key).toBe(recipeSlots.size)
      const layerNames = new Set<string>()
      for (const [layer, slot] of layers) {
        expect(recipeSlots.has(slot), `${key}: ${slot}`).toBe(true)
        expect(layer, `${key}: ${slot}`).toBe(figmaLayerName(slot))
        if (plugin) expect(plugin.slotMatchesLayer(slot, layer), `${key}: ${slot} → ${layer}`).toBe(true)
        layerNames.add(layer)
      }
      if (plugin) for (const s of plugin.recipeLayerSlots(table, key) as string[]) expect(layerNames.has(figmaLayerName(s)), `${key}: plugin slot ${s}`).toBe(true)
      // Binding rows only name layers listed above.
      for (const row of [...tableRows(md!, 'Layer').filter((r) => r.length === 5), ...tableRows(md!, 'When')]) {
        const layer = row.length === 6 ? row[1] : row[0]
        if (layer === '—') continue
        expect(layerNames.has(layer), `${key}: ${layer}`).toBe(true)
      }
    }
  })
})
