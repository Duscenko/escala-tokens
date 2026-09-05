import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { evaluate } from '../color/apca'
import type { TokenJSON } from '../agentBundle'
import { COMPONENT_KEYS } from '../componentCatalogue'
import {
  callTool,
  checkContrast,
  getComponent,
  handleMcpMessage,
  listComponents,
  mcpDiscovery,
  normalizeTokenId,
  parseIntent,
  resolveToken,
  TOOL_SPECS,
} from '../agentAccess'

const accessDir = join(dirname(fileURLToPath(import.meta.url)), '../agentAccess')
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

const JSON_FIXTURE: TokenJSON = {
  project: 'Parity',
  colors: {
    primitive: { 'accent-6': '#7f56d9', 'neutral-12': '#111111' },
    themeOrder: ['light', 'dark'],
    themes: {
      light: { 'content-primary': '#111111' },
      dark: { 'content-primary': '#f5f5f5' },
    },
    architecture: {
      kind: 'categorical',
      tokens: {
        action: {
          'primary.default': { light: '#7f56d9', dark: '#9e77ed' },
        },
        content: {
          'on-action': { light: '#ffffff', dark: '#111111' },
        },
      },
    },
  },
  typography: { fontFamily: 'Inter', sizes: {}, weights: {} },
  spacing: { '1': '4px', '5': '20px' },
  radius: { md: '8px' },
  icons: {
    aiSource: { key: 'untitled', label: 'Untitled UI Icons', repo: 'https://github.com/untitleduico/icons', npm: '@untitledui/icons' },
    custom: [{ name: 'star' }],
  },
}

const load = async (project?: string | null) => {
  if (project && project !== 'parity') return null
  return JSON_FIXTURE
}

/**
 * A REAL published system: `+ Theme` / adopting a System Style mints families
 * named after the theme, so the payload has no `accent` family at all — the
 * `themeSources` map is the only thing tying the canonical vocabulary to it.
 * Shape copied from a live `/api/tokens?project=` payload.
 */
const THEMED_FIXTURE: TokenJSON = {
  project: 'Hola',
  colors: {
    primitive: {
      'material--elevation-9': '#2e7769',
      'material--elevation-gray-1': '#ffffff',
      'material--elevation-error-9': '#b3261e',
    },
    primitiveAlpha: { 'material--elevation-3': '#2e77691f' },
    themeOrder: ['material--elevation'],
    activeTheme: 'material--elevation',
    themeLabels: { 'material--elevation': 'Material / Elevation' },
    themeSources: {
      'material--elevation': {
        brand: 'material--elevation',
        gray: 'material--elevation-gray',
        error: 'material--elevation-error',
        warning: 'material--elevation-warning',
        success: 'material--elevation-success',
        info: 'material--elevation-info',
      },
    },
  },
  typography: { fontFamily: 'Inter', sizes: {}, weights: {} },
  spacing: {},
  radius: { lg: '32px' },
  foundationsByTheme: { 'material--elevation': { radius: { lg: '16px' } } },
}

describe('tool schemas match the handlers', () => {
  // Exactly the arguments each schema marks `required`, and nothing more.
  const MINIMAL: Record<string, Record<string, unknown>> = {
    get_tokens: { project: 'parity' },
    resolve_token: { project: 'parity', token: 'accent-6' },
    list_components: {},
    get_component: { key: 'Button' },
    list_icons: { project: 'parity' },
    check_contrast: { foreground: '#111111', background: '#ffffff' },
  }

  it('covers every shipped tool', () => {
    expect(Object.keys(MINIMAL).sort()).toEqual(TOOL_SPECS.map((t) => t.name).sort())
  })

  // `list_icons` declared `project` optional while its handler had always
  // thrown without it — an agent trusting the schema called with no args and
  // got an error instead of icons. Required must mean required, both ways.
  it.each(TOOL_SPECS.map((t) => [t.name] as const))('%s succeeds on exactly its required args', async (name) => {
    const spec = TOOL_SPECS.find((t) => t.name === name)!
    expect(Object.keys(MINIMAL[name]!).sort()).toEqual([...(spec.inputSchema.required ?? [])].sort())
    await expect(callTool(name, MINIMAL[name], load)).resolves.toBeDefined()
  })

  it.each(
    TOOL_SPECS.flatMap((t) => (t.inputSchema.required ?? []).map((arg) => [t.name, arg] as const)),
  )('%s rejects when required %s is missing', async (name, arg) => {
    const args = { ...MINIMAL[name] }
    delete args[arg]
    await expect(callTool(name, args, load)).rejects.toThrow()
  })
})

describe('resolve_token on a theme-minted system', () => {
  // Every one of these returned `unknown` before `themeSources` was consulted —
  // i.e. the skill's own vocabulary failed against a real published system.
  it.each([
    ['accent-9', 'material--elevation-9', '#2e7769'],
    ['neutral-1', 'material--elevation-gray-1', '#ffffff'],
    ['error-9', 'material--elevation-error-9', '#b3261e'],
  ])('resolves canonical %s through themeSources', (query, key, hex) => {
    const r = resolveToken(THEMED_FIXTURE, query)
    expect(r.found).toBe(true)
    expect(r.id).toBe(key)
    expect(r.values.default).toBe(hex)
  })

  it('resolves the canonical Figma name too, padded or not', () => {
    for (const q of ['Accent/09', 'Accents/Accent/09', 'Accent/9']) {
      expect(resolveToken(THEMED_FIXTURE, q).id).toBe('material--elevation-9')
    }
  })

  it('resolves an alpha twin through the same alias', () => {
    const r = resolveToken(THEMED_FIXTURE, 'accent-a-3')
    expect(r.found).toBe(true)
    expect(r.values.default).toBe('#2e77691f')
  })

  it('reports the Figma name the PLUGIN writes, not the legacy one', () => {
    // The plugin nests every family under Accents / Neutrals / States; the old
    // name is what it keeps solely to rename variables in place on re-import.
    expect(resolveToken(THEMED_FIXTURE, 'accent-9').figma).toBe('Accents/Material Elevation/09')
    expect(resolveToken(THEMED_FIXTURE, 'neutral-1').figma).toBe('Neutrals/Material Elevation Gray/01')
    expect(resolveToken(THEMED_FIXTURE, 'error-9').figma).toBe('States/Error/09')
    expect(resolveToken(JSON_FIXTURE, 'accent-6').figma).toBe('Accents/Accent/06')
  })

  it('prefers the per-theme foundation over the root fallback', () => {
    // Root says lg 32; the theme actually ships 16. Root is the plugin's
    // compatibility copy and must never win.
    expect(resolveToken(THEMED_FIXTURE, 'radius.lg').values).toEqual({ 'material--elevation': '16px' })
  })
})

describe('agentAccess import boundary', () => {
  it('does not import the store or tokenGenerator', () => {
    const files = readdirSync(accessDir).filter((f) => f.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const src = readFileSync(join(accessDir, file), 'utf8')
      expect(src, file).not.toMatch(/useDesignStore/)
      expect(src, file).not.toMatch(/from ['"]\.\.\/tokenGenerator['"]/)
      expect(src, file).not.toMatch(/from ['"]\.\.\/store\//)
    }
  })

  it('check_contrast is wired to lib/color/apca', () => {
    const src = readFileSync(join(accessDir, 'contrast.ts'), 'utf8')
    expect(src).toMatch(/from ['"]\.\.\/color\/apca(?:\.js)?['"]/)
    expect(src).not.toContain('chroma.contrast')
  })
})

describe('resolve_token', () => {
  it('normalizes Figma slashes to catalogue ids', () => {
    expect(normalizeTokenId('Action/primary/default')).toBe('action.primary.default')
    expect(normalizeTokenId('action.primary.default')).toBe('action.primary.default')
  })

  it('resolves a semantic architecture role to CSS, Figma, and hex per theme', () => {
    const hit = resolveToken(JSON_FIXTURE, 'Action/primary/default')
    expect(hit.found).toBe(true)
    expect(hit.kind).toBe('semantic')
    expect(hit.id).toBe('action.primary.default')
    expect(hit.figma).toBe('Action/primary/default')
    expect(hit.css).toBe('var(--color-action-primary-default)')
    expect(hit.values.light).toBe('#7f56d9')
    expect(hit.values.dark).toBe('#9e77ed')
  })

  it('resolves a primitive by key or Figma name', () => {
    const a = resolveToken(JSON_FIXTURE, 'accent-6')
    const b = resolveToken(JSON_FIXTURE, 'Accent/06')
    expect(a.found && b.found).toBe(true)
    expect(a.css).toBe('var(--color-accent-6)')
    expect(a.values.default).toBe('#7f56d9')
    expect(b.id).toBe('accent-6')
  })

  it('resolves a spacing step under step/', () => {
    const hit = resolveToken(JSON_FIXTURE, 'spacing.5')
    expect(hit.found).toBe(true)
    expect(hit.kind).toBe('foundation')
    expect(hit.figma).toBe('step/5')
    expect(hit.css).toBe('var(--spacing-5)')
    expect(hit.values.default).toBe('20px')
  })

  it('does not invent an unknown role', () => {
    const hit = resolveToken(JSON_FIXTURE, 'action.magic.default')
    expect(hit.found).toBe(false)
    expect(hit.kind).toBe('unknown')
  })

  it('reads foundationsByTheme over the root fallback', () => {
    const json: TokenJSON = {
      ...JSON_FIXTURE,
      radius: { lg: '32px' },
      stroke: { sm: '1px' },
      selector: { md: '18px' },
      colors: {
        ...JSON_FIXTURE.colors,
        themeOrder: ['material--elevation'],
      },
      foundationsByTheme: {
        'material--elevation': {
          radius: { lg: '16px' },
          stroke: { sm: '0.5px' },
          selector: { md: '21px' },
        },
      },
    }
    const radius = resolveToken(json, 'radius.lg')
    expect(radius.found).toBe(true)
    expect(radius.css).toBe('var(--radius-lg)')
    expect(radius.values).toEqual({ 'material--elevation': '16px' })
    expect(radius.values.default).toBeUndefined()

    const stroke = resolveToken(json, 'stroke.sm')
    expect(stroke.found).toBe(true)
    expect(stroke.css).toBe('var(--stroke-sm)')
    expect(stroke.values).toEqual({ 'material--elevation': '0.5px' })

    const selector = resolveToken(json, 'selector.md')
    expect(selector.found).toBe(true)
    expect(selector.css).toBe('var(--selector-md)')
    expect(selector.values).toEqual({ 'material--elevation': '21px' })
  })
})

describe('catalogue and contrast tools', () => {
  it('lists catalogue keys and fetches Button', () => {
    const list = listComponents()
    expect(list.map((c) => c.key)).toEqual(COMPONENT_KEYS)
    expect(list.some((c) => c.key === 'Button' && c.essential)).toBe(true)
    const button = getComponent('button')
    expect(button?.key).toBe('Button')
    expect(button?.props.some((p) => p.name === 'color')).toBe(true)
    expect(button?.accessibility).toMatch(/button/i)
  })

  it('check_contrast matches evaluate() from apca.ts, including action-label', () => {
    const fg = '#111111'
    const bg = '#ffffff'
    expect(checkContrast(fg, bg, 'body-text')).toEqual(evaluate(fg, bg, 'body-text'))
    expect(checkContrast(fg, bg, 'action-label')).toEqual(evaluate(fg, bg, 'action-label'))
    expect(parseIntent('action-label')).toBe('action-label')
    expect(checkContrast(fg, bg).pass).toBe(true)
  })
})

describe('MCP JSON-RPC', () => {
  it('get_tokens requires a project slug', async () => {
    await expect(callTool('get_tokens', {}, load)).rejects.toThrow(/project is required/)
  })

  it('initialize + tools/list + resolve_token', async () => {
    const init = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    }, load)
    expect(init && 'result' in init && (init as { result: { serverInfo: { name: string } } }).result.serverInfo.name).toBe('escala-tokens')

    const listed = await handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, load) as { result: { tools: { name: string }[] } }
    expect(listed.result.tools.map((t) => t.name)).toEqual(TOOL_SPECS.map((t) => t.name))

    const call = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'resolve_token', arguments: { token: 'action.primary.default', project: 'parity' } },
    }, load) as { result: { structuredContent: { css: string }; isError?: boolean } }
    expect(call.result.isError).toBeUndefined()
    expect(call.result.structuredContent.css).toBe('var(--color-action-primary-default)')
  })

  it('unknown token is a tool error, not a crash', async () => {
    const call = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'resolve_token', arguments: { token: 'nope', project: 'parity' } },
    }, load) as { result: { isError: boolean; content: { text: string }[] } }
    expect(call.result.isError).toBe(true)
    expect(call.result.content[0]?.text).toMatch(/Unknown token/)
  })

  it('list_icons reads aiSource from JSON', async () => {
    const icons = await callTool('list_icons', { project: 'parity' }, load) as { aiSource: { repo: string }; custom: string[] }
    expect(icons.aiSource.repo).toContain('untitleduico')
    expect(icons.custom).toEqual(['star'])
  })

  it('notifications produce no response', async () => {
    const res = await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, load)
    expect(res).toBeNull()
  })
})

describe('discovery and schema publish', () => {
  it('lists the six tools', () => {
    expect(mcpDiscovery('https://escalatokens.com').tools).toEqual([
      'get_tokens',
      'resolve_token',
      'list_components',
      'get_component',
      'list_icons',
      'check_contrast',
    ])
  })

  it('requires a published project slug and exposes action-label', () => {
    const getTokens = TOOL_SPECS.find((t) => t.name === 'get_tokens')
    const resolve = TOOL_SPECS.find((t) => t.name === 'resolve_token')
    const contrast = TOOL_SPECS.find((t) => t.name === 'check_contrast')
    expect(getTokens?.inputSchema.required).toEqual(['project'])
    expect(resolve?.inputSchema.required).toEqual(['token', 'project'])
    const intent = contrast?.inputSchema.properties.intent as { enum?: string[] }
    expect(intent.enum).toContain('action-label')
  })

  it('public schema matches docs/agent-native/tokens.schema.json', () => {
    const docs = readFileSync(join(repoRoot, 'docs/agent-native/tokens.schema.json'), 'utf8')
    const pub = readFileSync(join(repoRoot, 'public/docs/agent-native/tokens.schema.json'), 'utf8')
    expect(pub).toBe(docs)
  })
})
