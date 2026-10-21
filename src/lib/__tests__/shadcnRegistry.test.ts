import { describe, expect, it, beforeAll } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTokenJSON } from '../tokenGenerator'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import type { TokenJSON } from '../agentBundle/types'
import { COMPONENT_RECIPES } from '../componentRecipes'
import { recipeCss, recipeCssVars } from '../recipeStyles'
import { resolveToken } from '../agentAccess/resolveToken'
import { ESCALA_UI_SOURCES } from '../registry/escalaUiSources.generated'
import { readEscalaUiSources, renderGeneratedModule } from '../../../scripts/registrySources'
import { transformEscalaUi } from '../registry/escalaUiTransform'
import {
  REGISTRY_ITEM_SCHEMA, buildRegistryIndex, buildRegistryItem, cssRulesOf, registryItemFor, registryItemNames,
} from '../registry/shadcnRegistry'
import { roleColor, systemModes } from '../registry/systemValues'
import { SHADCN_ROLE_MAP, buildShadcnGlobalsCss, shadcnTheme } from '../shadcnGlobals'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const OPTS = { origin: 'https://escalatokens.com', project: 'esc_test' }

let json: TokenJSON
/** What a Figma sync publishes: `brand::appearance` columns. */
let synced: TokenJSON

beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  const { ensureColorScales } = await import('../colorActions')
  ensureColorScales()
  json = generateTokenJSON() as unknown as TokenJSON
  const brand = useDesignStore.getState().themeOrder[0]
  synced = generateTokenJSON(undefined, {
    modes: [{ theme: brand, appearance: 'light' }, { theme: brand, appearance: 'dark' }],
  }) as unknown as TokenJSON
})

describe('registry sources', () => {
  it('the generated module is in sync with components/escala-ui (run `npm run gen:registry-sources`)', () => {
    const fresh = readEscalaUiSources(ROOT)
    expect(renderGeneratedModule(fresh)).toBe(renderGeneratedModule(ESCALA_UI_SOURCES))
  })

  it('every catalogue component is served by some item', () => {
    const missing = Object.keys(COMPONENT_RECIPES).filter((k) => !registryItemFor(k))
    expect(missing).toEqual([])
    expect(registryItemFor('Dialog')).toBe('dialog')
    expect(registryItemFor('Button')).toBe('button')
  })

  it('no shipped file reaches into the app: only @/ aliases and npm packages', () => {
    for (const src of ESCALA_UI_SOURCES) {
      const specs = [...src.source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
      for (const spec of specs) expect(spec.startsWith('.'), `${src.name} → ${spec}`).toBe(false)
      expect(src.source, src.name).not.toMatch(/\biconOf\(/)
    }
  })

  it('a new relative import is refused, not shipped', () => {
    expect(() => transformEscalaUi('x.tsx', "import { a } from '../../lib/store'\n", { iconsSource: '', iconOf: (n) => n }))
      .toThrow(/app internals/)
  })
})

describe('registry item (shadcn CLI format)', () => {
  it('Button: schema, file, dependencies', () => {
    const item = buildRegistryItem('button', json, OPTS)!
    expect(item.$schema).toBe(REGISTRY_ITEM_SCHEMA)
    expect(item).toMatchObject({ name: 'button', type: 'registry:ui' })
    expect(item.files).toHaveLength(1)
    expect(item.files![0]).toMatchObject({ path: 'registry/escala/button.tsx', type: 'registry:ui' })
    expect(item.files![0].content).toContain("from '@/lib/utils'")
    expect(item.files![0].content).toContain('data-escala={recipe}')
    expect(item.dependencies).toEqual(['radix-ui'])
    expect(item.registryDependencies).toEqual(['utils'])
    // Values ride in `css`, never `cssVars` (the CLI would mirror them into @theme).
    expect(item.cssVars).toBeUndefined()
    expect(Object.keys(item.css!)).toEqual([':root', '.dark', '@layer components'])
  })

  it('internal imports become registry dependencies on this registry, for the same system', () => {
    const select = buildRegistryItem('select', json, { ...OPTS, brand: 'core' })!
    expect(select.registryDependencies).toContain('https://escalatokens.com/r/portal-scope.json?project=esc_test&brand=core')
    expect(select.files![0].content).toContain("from '@/components/ui/portal-scope'")
  })

  it('EVERY item: each variable its rules (or its source) read has a value from the published system', () => {
    for (const name of registryItemNames().filter((n) => n !== 'theme')) {
      const item = buildRegistryItem(name, synced, OPTS)!
      const src = ESCALA_UI_SOURCES.find((s) => s.name === name)!
      const css = src.recipes.map((k) => recipeCss(COMPONENT_RECIPES[k])).join('\n')
      const needed = [...recipeCssVars(css), ...src.vars].filter((v) => !/^--(escala|radix)-/.test(v))
      const root = (item.css?.[':root'] ?? {}) as Record<string, string>
      const unresolved = needed.filter((v) => !root[v])
      expect(unresolved, name).toEqual([])
      if (css) expect(Object.keys(item.css!['@layer components']).length, name).toBe(css.match(/\{/g)!.length)
    }
  })

  it('values are the payload\'s: colour roles per appearance, lengths from resolveToken', () => {
    const modes = systemModes(synced)
    expect(modes.dark).not.toBeNull()
    const item = buildRegistryItem('button', synced, OPTS)!
    const root = item.css![':root'] as Record<string, string>
    const dark = item.css!['.dark'] as Record<string, string>
    expect(root['--color-action-primary-default']).toBe(roleColor(synced, 'action.primary.default', modes.light))
    expect(dark['--color-action-primary-default']).toBe(roleColor(synced, 'action.primary.default', modes.dark!))
    expect(root['--radius-action']).toBe(Object.values(resolveToken(synced, 'radius.action').values)[0])
    expect(root['--size-control']).toMatch(/^\d+px$/)
    // A length is one value: dark carries only what changes.
    expect(dark['--size-control']).toBeUndefined()
    for (const [k, v] of Object.entries(dark)) expect(root[k], k).not.toBe(v)
  })

  it('cssRulesOf keeps grouped selectors together', () => {
    const rules = cssRulesOf('a,\nb {\n  color: red;\n  gap: var(--x);\n}\nc {\n  border: 0;\n}\na,\nb {\n  color: blue;\n}')
    expect(rules).toEqual({
      'a, b': { color: 'red', gap: 'var(--x)' },
      c: { border: '0' },
      // A repeated selector stays a separate rule, after the ones before it.
      'a:where(*), b:where(*)': { color: 'blue' },
    })
    expect(Object.keys(rules)).toEqual(['a, b', 'c', 'a:where(*), b:where(*)'])
  })

  it('unknown item → null; index lists every item with its URL', () => {
    expect(buildRegistryItem('nope', json, OPTS)).toBeNull()
    const index = buildRegistryIndex(OPTS)
    expect(index.items.map((i) => i.name)).toEqual(registryItemNames())
    expect(index.items.find((i) => i.name === 'button')!.url).toBe('https://escalatokens.com/r/button.json?project=esc_test')
  })
})

describe('shadcn globals.css (E4 map)', () => {
  it('every mapped role exists in the published system', () => {
    const modes = systemModes(synced)
    for (const [, role] of SHADCN_ROLE_MAP) expect(roleColor(synced, role, modes.light), role).toBeTruthy()
  })

  it('each shadcn variable is its Categorical role, light and dark', () => {
    const modes = systemModes(synced)
    const theme = shadcnTheme(synced)
    for (const [name, role] of SHADCN_ROLE_MAP) {
      expect(theme.light[name], name).toBe(roleColor(synced, role, modes.light))
      expect(theme.dark![name], name).toBe(roleColor(synced, role, modes.dark!))
    }
    expect(theme.light.primary).toBe(roleColor(synced, 'action.primary.default', modes.light))
    // shadcn's `--input` is the field outline: border.control (shadcnGlobals.ts).
    expect(theme.light.input).toBe(roleColor(synced, 'border.control', modes.light))
    expect(theme.light.radius).toMatch(/^\d+px$/)
    expect(Object.keys(theme.light).filter((k) => k.startsWith('chart-'))).toHaveLength(5)
  })

  it('the file is shadcn\'s shape: :root, .dark, @theme inline, base layer', () => {
    const css = buildShadcnGlobalsCss(synced)
    expect(css).toContain('@import "tailwindcss";')
    expect(css).toMatch(/:root \{[^}]*--primary: #[0-9a-f]{6,8};/)
    expect(css).toMatch(/\.dark \{[^}]*--background: #[0-9a-f]{6,8};/)
    expect(css).toContain('--color-primary: var(--primary);')
    expect(css).toContain('--radius-lg: var(--radius);')
    expect(css).toContain('@apply bg-background text-foreground;')
  })

  it('a whole-system payload pairs its light and dark columns', () => {
    const modes = systemModes(json)
    expect(modes.dark).not.toBeNull()
    expect(buildShadcnGlobalsCss(json)).toContain('.dark {')
  })

  it('brand selection: ?brand picks that brand\'s two columns', () => {
    const fake = {
      colors: {
        themeOrder: ['a::light', 'a::dark', 'b::light', 'b::dark'],
        architecture: { tokens: { action: { 'primary.default': { 'a::light': '#111111', 'a::dark': '#222222', 'b::light': '#333333', 'b::dark': '#444444' } } } },
      },
    } as unknown as TokenJSON
    expect(systemModes(fake)).toEqual({ brand: 'a', light: 'a::light', dark: 'a::dark' })
    expect(systemModes(fake, 'b')).toEqual({ brand: 'b', light: 'b::light', dark: 'b::dark' })
    expect(shadcnTheme(fake, 'b').dark!.primary).toBe('#444444')
  })
})
