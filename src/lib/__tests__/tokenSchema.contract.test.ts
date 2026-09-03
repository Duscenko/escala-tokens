import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TOKEN_SCHEMA_VERSION, generateTokenJSON } from '../tokenGenerator'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readRepo(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('token schema contract (docs/agent-native)', () => {
  const schema = JSON.parse(readRepo('docs/agent-native/tokens.schema.json')) as {
    required?: string[]
    properties?: { schemaVersion?: { minimum?: number } }
  }
  const contracts = readRepo('docs/agent-native/CONTRACTS.md')

  it('JSON Schema requires the plugin handshake fields', () => {
    expect(schema.required).toEqual(expect.arrayContaining(['schemaVersion', 'project', 'colors']))
    expect(schema.properties?.schemaVersion?.minimum).toBe(3)
  })

  it('CONTRACTS.md documents the live TOKEN_SCHEMA_VERSION', () => {
    expect(contracts).toContain(String(TOKEN_SCHEMA_VERSION))
    expect(contracts).toContain('/api/tokens')
    expect(contracts).toContain('`atoms`')
  })

  it('generateTokenJSON stamps the constant and keeps the plugin core', () => {
    const json = generateTokenJSON()
    expect(json.schemaVersion).toBe(TOKEN_SCHEMA_VERSION)
    expect(json.colors?.primitive && typeof json.colors.primitive).toBe('object')
    expect(json).toHaveProperty('atoms')
    expect(json).not.toHaveProperty('components')
    expect(json.typography?.roles && typeof json.typography.roles).toBe('object')
    expect(json.stroke && typeof json.stroke).toBe('object')
    expect(json.strokeRoles && typeof json.strokeRoles).toBe('object')
    expect(json.sizeRoles && typeof json.sizeRoles).toBe('object')
    expect(json.spacingRoles && typeof json.spacingRoles).toBe('object')
    expect(json.foundationsByTheme && typeof json.foundationsByTheme).toBe('object')
    expect(json.borders?.width).toEqual(json.stroke)
    expect(json.descriptions && typeof json.descriptions).toBe('object')
    expect(json.descriptions?.['Color Semantics']?.['Content/primary']).toMatch(/High Contrast Text/)
    expect(json.descriptions?.['Radius']?.['role/action']).toMatch(/Buttons/)
  })
})
