// Locks the 2026-10-18 audit of "context for agents": every paste agrees with
// variables.css, names what the Figma plugin actually writes, honours the
// appearance it was asked for, and never hands an agent code that does not
// parse or a command that does not exist.
import { beforeAll, describe, expect, it } from 'vitest'
import ts from 'typescript'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { ensureColorScales } from '../colorActions'
import { captureCodeSnapshot } from '../codeScope'
import { brandContext, brandContext as brandContextFull, contextTokenJson } from '../contextSource'
import { extractEscalaPayload } from '../figmaContext'
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
    // The prose only: the trailing Escala JSON is the whole payload the plugin imports.
    const brandContext = (...a: Parameters<typeof brandContextFull>) => brandContextFull(...a).split('\n## Escala JSON\n')[0]
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

describe('one context for Figma and agents', () => {
  it('All foundations ends with an Escala JSON the plugin reads as a system', () => {
    const store = useDesignStore.getState()
    for (const req of [
      { scope: 'all', detail: 'full', appearance: 'both' },
      { scope: 'all', detail: 'tokens', appearance: 'light' },
    ] as const) {
      const md = brandContext(store, brand, req, store.projectName)
      const raw = JSON.parse(extractEscalaPayload(md))
      expect(raw.colors).toBeTruthy()
      expect(raw.project).toBeTruthy()
      // ONE brand in the plugin: columns are brand::appearance, never a plain
      // light / dark (which the plugin's matrix reads as two brands).
      const cols: string[] = raw.colors.themeOrder
      expect(new Set(cols.map((c) => c.split('::')[0])).size).toBe(1)
      expect(cols.every((c) => c.includes('::'))).toBe(true)
    }
  })

  it("the plugin's Copy context (agentMarkdownFromJSON) goes back into the web as a brand", async () => {
    const { agentMarkdownFromJSON } = await import('../agentBundle')
    const { readBrandPayload } = await import('../importBrand')
    const json = generateTokenJSON(captureCodeSnapshot(useDesignStore.getState(), brand)) as unknown as TokenJSON
    const md = agentMarkdownFromJSON(json)
    expect(JSON.parse(extractEscalaPayload(md)).colors).toBeTruthy()
    expect(readBrandPayload(md, 'context').ok).toBe(true)
  })

  it('one foundation stays light: no JSON, and a title the plugin recognises as partial', () => {
    const store = useDesignStore.getState()
    const md = brandContext(store, brand, { scope: 'radius', detail: 'tokens', appearance: 'light' }, store.projectName)
    expect(md).not.toContain('```json')
    // escala-figma-plugin/src/ui.html classifyPaste reads this line (kind 'partial').
    expect(md).toMatch(/^# .+ — radius tokens$/m)
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
    expect(md).not.toContain('### Radius (')
  })

  it('with the brand payload, every part row names the Figma variable the plugin binds', () => {
    const store = useDesignStore.getState()
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const json = generateTokenJSON() as unknown as TokenJSON
    const md = agentContextMarkdown(button, '<Button />', resolvePreviewTokens(store, brand, 'light') as never, json)
    expect(md).toContain('`Radius/role/action`')
    expect(md).toContain('`Size/role/control`')
    expect(md).not.toContain('not published')
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

  it('both component files carry the catalogue\'s own "when to use", word for word', async () => {
    const { buildDesignSkillFiles, componentBuildPath, componentReactPath } = await import('../agentBundle/productDesignSkills')
    const files = buildDesignSkillFiles(productJson([...COMPONENT_KEYS]))
    for (const def of COMPONENTS) {
      for (const path of [componentBuildPath(def.key), componentReactPath(def.key)]) {
        const md = files.find((f) => f.path === path)?.text
        if (!md) continue
        expect(md, path).toContain(`## When to use\n\n${def.usage.trim()}\n`)
      }
    }
  })
})

describe('component-build (React) ↔ recipes, escala-ui and variables.css', () => {
  it('every part, attribute and variable the React files cite is one the stylesheet and the component use', async () => {
    const { readFileSync, existsSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const { COMPONENT_RECIPES } = await import('../componentRecipes')
    const { recipeCss } = await import('../recipeStyles')
    const { componentFileName } = await import('../agentContext')
    const { UNPAINTED, buildDesignSkillFiles, componentReactPath, figmaSlotsOf, selectorPieces } = await import('../agentBundle/productDesignSkills')
    const uiDir = join(dirname(fileURLToPath(import.meta.url)), '../../components/escala-ui')
    const files = buildDesignSkillFiles(productJson([...COMPONENT_KEYS]))
    for (const key of COMPONENT_KEYS) {
      const recipe = COMPONENT_RECIPES[key]
      if (!recipe) continue
      const md = files.find((f) => f.path === componentReactPath(key))?.text
      expect(md, key).toBeTruthy()
      const css = recipeCss(recipe)
      const slots = new Set(figmaSlotsOf(recipe))
      for (const [slot, selector, note] of tableRows(md!, 'Slot')) {
        expect(slots.has(slot), `${key}: ${slot}`).toBe(true)
        // Every piece of the selector is one the generated sheet writes — or the
        // row says the sheet has no rule for that part.
        const painted = selectorPieces(selector).every((piece) => css.includes(piece))
        expect(painted || note.includes(UNPAINTED), `${key}: ${slot} ${selector}`).toBe(true)
        if (slot === recipe.slots[0]) expect(painted, `${key}: root`).toBe(true)
      }
      const src = existsSync(join(uiDir, `${componentFileName(key)}.tsx`)) ? readFileSync(join(uiDir, `${componentFileName(key)}.tsx`), 'utf8') : ''
      for (const [attr] of tableRows(md!, 'Attribute')) {
        const name = attr.replace(/=.*$/, '')
        if (name === 'data-force-state' || name === 'data-escala') continue
        expect(css, `${key}: ${name}`).toContain(`[${name}=`)
        if (src && !recipe.dom) expect(src, `${key}: escala-ui sets ${name}`).toContain(name)
      }
    }
  })

  it('recipes.css only reads variables that variables.css declares', async () => {
    const { recipeCssVars } = await import('../recipeStyles')
    const { RECIPES_CSS_PATH, buildDesignSkillFiles } = await import('../agentBundle/productDesignSkills')
    const sheet = buildDesignSkillFiles(productJson([...COMPONENT_KEYS])).find((f) => f.path === RECIPES_CSS_PATH)!.text
    const declared = new Set([
      ...[...buildCSS(captureCodeSnapshot(useDesignStore.getState(), brand) as never).matchAll(/(--[\w-]+):/g)].map((m) => m[1]),
      ...[...sheet.matchAll(/(--[\w-]+):/g)].map((m) => m[1]),
    ])
    const used = recipeCssVars(sheet)
    expect(used.length).toBeGreaterThan(100)
    expect(used.filter((v) => !declared.has(v))).toEqual([])
  })
})

describe('screen-compose ↔ artefacts', () => {
  it('every pattern mirrors the artefact it names', async () => {
    const { readFileSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const { SCREEN_PATTERNS } = await import('../agentBundle/screenPatterns')
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../components/preview/artefacts')
    const index = readFileSync(join(dir, 'index.ts'), 'utf8')
    for (const p of SCREEN_PATTERNS) {
      const src = readFileSync(join(dir, p.source), 'utf8')
      expect(src, p.key).toContain(`key: '${p.key}'`)
      expect(index, p.key).toContain(p.source.replace(/\.tsx$/, ''))
      const rendered = new Set([...src.matchAll(/SPECIMENS\.(\w+)/g)].map((m) => m[1]))
      expect([...new Set(p.parts.map((x) => x.key))].sort(), p.key).toEqual([...rendered].sort())
      for (const s of p.spacing) expect(src, `${p.key}: ${s.role}`).toContain(`'${s.role}'`)
      const spacing = new Set([...src.matchAll(/gap\(t, '([\w-]+)'/g)].map((m) => m[1]))
      expect([...spacing].sort(), p.key).toEqual(p.spacing.map((s) => s.role).sort())
      const type = new Set([...src.matchAll(/typeStyleOf\(t, '([\w-]+)'/g)].map((m) => m[1]))
      expect(p.type.map((t) => t.role).sort(), p.key).toEqual([...type].sort())
      for (const r of p.radius ?? []) expect(src, `${p.key}: ${r.role}`).toContain(`radiusRoleOf(t, '${r.role}'`)
      if (p.cardShadow) expect(src, p.key).toContain(`elev="${p.cardShadow}"`)
      for (const part of p.parts) for (const [axis, value] of Object.entries(part.axes ?? {})) expect(src, `${p.key}: ${part.key} ${axis}`).toContain(`${axis}: '${value}'`)
    }
    expect(SCREEN_PATTERNS.length).toBe((index.match(/_ARTEFACT,/g) ?? []).length)
  })

  it('every grid style screen-compose names is one the payload ships', async () => {
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const json = productJson()
    const md = buildAgentProductFiles(json).files.find((f) => f.path === 'skills/screen-compose/SKILL.md')!.text
    const labels = new Set((json.gridStyles ?? []).map((g) => g.label ?? g.key))
    const cited = [...md.matchAll(/`Grid\/([^`]+)`/g)].map((m) => m[1])
    expect(cited.length).toBe(labels.size)
    for (const c of cited) expect(labels.has(c), c).toBe(true)
  })
})

describe('package freshness (Fase 3)', () => {
  it('the stamp names the payload: same system, same fingerprint; one value changed, another', async () => {
    const { systemFingerprint } = await import('../agentBundle/stamp')
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const json = productJson()
    expect(systemFingerprint(json)).toBe(systemFingerprint(JSON.parse(JSON.stringify(json))))
    const changed = JSON.parse(JSON.stringify(json)) as TokenJSON
    changed.spacing = { ...changed.spacing, 4: '17px' }
    expect(systemFingerprint(changed)).not.toBe(systemFingerprint(json))
    const agents = buildAgentProductFiles(json, { generatedAt: '2026-10-20' }).files.find((f) => f.path === 'AGENTS.md')!.text
    expect(agents).toContain(`fingerprint: ${systemFingerprint(json)}`)
    expect(agents).toContain('generated: 2026-10-20')
    expect(agents).toContain('--check-version')
  })

  it('token-lint --check-version accepts the variables.css of its own system and names a changed token', async () => {
    const { execFileSync } = await import('node:child_process')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const snapshot = captureCodeSnapshot(useDesignStore.getState(), brand)
    const json = generateTokenJSON(snapshot) as unknown as TokenJSON
    const css = buildCSS(snapshot as never)
    const dir = mkdtempSync(join(tmpdir(), 'escala-lint-'))
    writeFileSync(join(dir, 'token-lint.mjs'), buildAgentProductFiles(json).files.find((f) => f.path === 'checkers/token-lint.mjs')!.text)
    writeFileSync(join(dir, 'variables.css'), css)
    const ok = execFileSync('node', ['token-lint.mjs', '--check-version'], { cwd: dir, encoding: 'utf8' })
    expect(ok).toContain('matches this package')
    const target = /--color-action-primary-default:\s*([^;]+);/.exec(css)!
    writeFileSync(join(dir, 'old.css'), css.replace(target[0], '--color-action-primary-default: #123456;'))
    let failed = ''
    try {
      execFileSync('node', ['token-lint.mjs', '--check-version', '--css', 'old.css'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
    } catch (e) {
      failed = String((e as { stderr?: string }).stderr)
    }
    expect(failed).toContain('--color-action-primary-default')
    expect(failed).toContain('#123456')
  })

  it('a push writes the package where the unzip command installs it, for both agents', async () => {
    const { repoSkillFiles } = await import('../agentBundle/repoSkills')
    const { buildAgentProductFiles } = await import('../agentBundle/product')
    const { skillInstallPath } = await import('../agentInstall')
    const json = productJson()
    const pushed = repoSkillFiles(json, { generatedAt: '2026-10-20' })
    expect(pushed.prefixes).toEqual([skillInstallPath('claude', json.project ?? ''), skillInstallPath('cursor', json.project ?? '')])
    const pkg = buildAgentProductFiles(json, { generatedAt: '2026-10-20' }).files
    expect(pushed.files.length).toBe(pkg.length * 2)
    for (const prefix of pushed.prefixes) {
      for (const f of pkg) expect(pushed.files.find((p) => p.path === `${prefix}${f.path}`)?.content, f.path).toBe(f.text)
    }
  })
})

describe('GitHub push: one commit', () => {
  type Call = { method: string; path: string; body?: Record<string, unknown> }
  function mockGitHub(opts: { empty?: boolean; existing?: string[] } = {}) {
    const calls: Call[] = []
    const fetchMock = async (url: string, init?: RequestInit) => {
      const path = url.replace('https://api.github.com', '')
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ method, path, body })
      const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status })
      if (path === '/repos/o/r') return json(200, { default_branch: 'main' })
      if (path === '/repos/o/r/git/ref/heads/main') return opts.empty ? json(409, { message: 'Git Repository is empty.' }) : json(200, { object: { sha: 'head' } })
      if (path === '/repos/o/r/git/commits/head') return json(200, { tree: { sha: 'base' } })
      if (path.startsWith('/repos/o/r/git/trees/base')) return json(200, { tree: (opts.existing ?? []).map((p) => ({ path: p, type: 'blob' })) })
      if (path === '/repos/o/r/git/trees') return json(201, { sha: 'tree2' })
      if (path === '/repos/o/r/git/commits') return json(201, { sha: 'commit2' })
      if (path === '/repos/o/r/git/refs/heads/main') return json(200, {})
      if (path.startsWith('/repos/o/r/contents/')) return method === 'GET' ? json(404, { message: 'Not Found' }) : json(201, {})
      return json(404, { message: `unexpected ${method} ${path}` })
    }
    return { calls, fetchMock }
  }

  it('writes every file in one tree, deletes stale package files, and moves the branch once', async () => {
    const { commitFiles } = await import('../github')
    const { calls, fetchMock } = mockGitHub({ existing: ['.claude/skills/x/old.md', '.claude/skills/x/AGENTS.md', 'src/app.ts'] })
    const real = globalThis.fetch
    globalThis.fetch = fetchMock as typeof fetch
    try {
      await commitFiles('t', 'o/r', [{ path: 'tokens.json', content: '{}' }, { path: '.claude/skills/x/AGENTS.md', content: '# x' }], 'msg', ['.claude/skills/x/'])
    } finally {
      globalThis.fetch = real
    }
    const tree = calls.find((c) => c.method === 'POST' && c.path === '/repos/o/r/git/trees')!.body!
    const entries = tree.tree as { path: string; content?: string; sha?: null }[]
    expect(tree.base_tree).toBe('base')
    expect(entries.map((e) => e.path).sort()).toEqual(['.claude/skills/x/AGENTS.md', '.claude/skills/x/old.md', 'tokens.json'])
    expect(entries.find((e) => e.path === '.claude/skills/x/old.md')!.sha).toBeNull()
    expect(entries.some((e) => e.path === 'src/app.ts')).toBe(false)
    expect(calls.filter((c) => c.path === '/repos/o/r/git/commits' && c.method === 'POST')).toHaveLength(1)
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ sha: 'commit2' })
  })

  it('an empty repo falls back to the Contents API', async () => {
    const { commitFiles } = await import('../github')
    const { calls, fetchMock } = mockGitHub({ empty: true })
    const real = globalThis.fetch
    globalThis.fetch = fetchMock as typeof fetch
    try {
      await commitFiles('t', 'o/r', [{ path: 'tokens.json', content: '{}' }], 'msg')
    } finally {
      globalThis.fetch = real
    }
    expect(calls.some((c) => c.method === 'PUT' && c.path === '/repos/o/r/contents/tokens.json')).toBe(true)
  })
})
