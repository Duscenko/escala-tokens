import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { evaluate } from '../color/apca'
import type { TokenJSON } from '../agentBundle'
import {
  callTool,
  checkContrast,
  getComponent,
  handleMcpMessage,
  listComponents,
  mcpDiscovery,
  normalizeTokenId,
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
    expect(src).toContain("from '../color/apca'")
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
})

describe('catalogue and contrast tools', () => {
  it('lists catalogue keys and fetches Button', () => {
    const list = listComponents()
    expect(list.some((c) => c.key === 'Button' && c.essential)).toBe(true)
    const button = getComponent('button')
    expect(button?.key).toBe('Button')
    expect(button?.props.some((p) => p.name === 'color')).toBe(true)
    expect(button?.accessibility).toMatch(/button/i)
  })

  it('check_contrast matches evaluate() from apca.ts', () => {
    const fg = '#111111'
    const bg = '#ffffff'
    expect(checkContrast(fg, bg, 'body-text')).toEqual(evaluate(fg, bg, 'body-text'))
    expect(checkContrast(fg, bg).pass).toBe(true)
  })
})

describe('MCP JSON-RPC', () => {
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

  it('public schema matches docs/agent-native/tokens.schema.json', () => {
    const docs = readFileSync(join(repoRoot, 'docs/agent-native/tokens.schema.json'), 'utf8')
    const pub = readFileSync(join(repoRoot, 'public/docs/agent-native/tokens.schema.json'), 'utf8')
    expect(pub).toBe(docs)
  })
})
